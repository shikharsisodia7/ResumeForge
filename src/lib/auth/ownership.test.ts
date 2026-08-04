import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";

const findFirstResume = vi.fn();
const findFirstVersion = vi.fn();
const findFirstPrompt = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    resume: { findFirst: (...args: unknown[]) => findFirstResume(...args) },
    resumeVersion: { findFirst: (...args: unknown[]) => findFirstVersion(...args) },
    customPrompt: { findFirst: (...args: unknown[]) => findFirstPrompt(...args) },
  },
}));

const { requireOwnedPrompt, requireOwnedResume, requireOwnedVersion } = await import("@/lib/auth/ownership");

beforeEach(() => {
  findFirstResume.mockReset();
  findFirstVersion.mockReset();
  findFirstPrompt.mockReset();
});

describe("requireOwnedResume", () => {
  it("returns the resume when the query (scoped to userId) finds a match", async () => {
    findFirstResume.mockResolvedValue({ id: "resume-1", userId: "user-a" });
    const resume = await requireOwnedResume("resume-1", "user-a");
    expect(resume.id).toBe("resume-1");
    expect(findFirstResume).toHaveBeenCalledWith({ where: { id: "resume-1", userId: "user-a" } });
  });

  it("throws NotFoundError when another user's id is passed — not a 403, so ownership can't be probed", async () => {
    // Simulates the DB honestly reporting no row matches (id, userId) together,
    // exactly what happens when user B requests user A's resume.
    findFirstResume.mockResolvedValue(null);
    await expect(requireOwnedResume("resume-1", "user-b")).rejects.toThrow(NotFoundError);
  });
});

describe("requireOwnedVersion", () => {
  it("scopes the lookup through resume.userId, not a client-supplied owner field", async () => {
    findFirstVersion.mockResolvedValue({ id: "version-1", resume: { userId: "user-a" } });
    await requireOwnedVersion("version-1", "user-a");
    expect(findFirstVersion).toHaveBeenCalledWith({
      where: { id: "version-1", resume: { userId: "user-a" } },
      include: { resume: true },
    });
  });

  it("throws NotFoundError for a version owned by a different user", async () => {
    findFirstVersion.mockResolvedValue(null);
    await expect(requireOwnedVersion("version-1", "user-b")).rejects.toThrow(NotFoundError);
  });
});

describe("requireOwnedPrompt", () => {
  it("throws NotFoundError for a private prompt owned by a different user", async () => {
    findFirstPrompt.mockResolvedValue(null);
    await expect(requireOwnedPrompt("prompt-1", "user-b")).rejects.toThrow(NotFoundError);
    expect(findFirstPrompt).toHaveBeenCalledWith({ where: { id: "prompt-1", creatorId: "user-b" } });
  });

  it("returns the prompt for its actual creator", async () => {
    findFirstPrompt.mockResolvedValue({ id: "prompt-1", creatorId: "user-a" });
    const prompt = await requireOwnedPrompt("prompt-1", "user-a");
    expect(prompt.id).toBe("prompt-1");
  });
});

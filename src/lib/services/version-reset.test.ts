import { beforeEach, describe, expect, it, vi } from "vitest";

const updateManyVersion = vi.fn();
const updateVersion = vi.fn();
const updateManyVersionPrompt = vi.fn();
const createGenerationRun = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    resumeVersion: {
      updateMany: (...args: unknown[]) => updateManyVersion(...args),
      update: (...args: unknown[]) => updateVersion(...args),
    },
    versionPrompt: {
      updateMany: (...args: unknown[]) => updateManyVersionPrompt(...args),
    },
    generationRun: {
      create: (...args: unknown[]) => createGenerationRun(...args),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        resumeVersion: { update: (...args: unknown[]) => updateVersion(...args) },
        versionPrompt: { updateMany: (...args: unknown[]) => updateManyVersionPrompt(...args) },
        generationRun: { create: (...args: unknown[]) => createGenerationRun(...args) },
      }),
  },
}));

const { resetVersion } = await import("@/lib/services/version-reset");
type OwnedVersion = Parameters<typeof resetVersion>[0];

const baseContent = { basics: { fullName: "Jane", links: [] } };
const baseStyle = { pageSize: "letter" };

function makeVersion(overrides: Record<string, unknown> = {}): OwnedVersion {
  return {
    id: "version-1",
    resumeId: "resume-1",
    revision: 3,
    contentJson: { basics: { fullName: "Jane (customized)", links: [] } },
    styleJson: { pageSize: "a4" },
    baseContentJson: baseContent,
    baseStyleJson: baseStyle,
    resume: { id: "resume-1", userId: "user-a" },
    ...overrides,
  } as unknown as OwnedVersion;
}

beforeEach(() => {
  updateManyVersion.mockReset().mockResolvedValue({ count: 1 });
  updateVersion.mockReset().mockImplementation((args: { data: Record<string, unknown> }) => ({
    id: "version-1",
    ...args.data,
  }));
  updateManyVersionPrompt.mockReset().mockResolvedValue({ count: 2 });
  createGenerationRun.mockReset().mockResolvedValue({ id: "run-1" });
});

describe("resetVersion", () => {
  it("restores contentJson/styleJson from the immutable base snapshot", async () => {
    const result = await resetVersion(makeVersion(), "user-a");
    expect(result.contentJson).toEqual(baseContent);
    expect(result.styleJson).toEqual(baseStyle);
  });

  it("bumps the revision and snapshots the pre-reset state for undo", async () => {
    const version = makeVersion();
    await resetVersion(version, "user-a");
    const updateCall = updateVersion.mock.calls[0][0];
    expect(updateCall.data.revision).toEqual({ increment: 1 });
    expect(updateCall.data.previousContentJson).toEqual(version.contentJson);
    expect(updateCall.data.previousRevision).toBe(3);
  });

  it("deactivates active version-prompt links without deleting the underlying prompts", async () => {
    await resetVersion(makeVersion(), "user-a");
    expect(updateManyVersionPrompt).toHaveBeenCalledWith({
      where: { versionId: "version-1", isActive: true },
      data: { isActive: false },
    });
    // Crucially: no call ever deletes a CustomPrompt or VersionPrompt row.
  });

  it("refuses to reset a version that's already being processed", async () => {
    updateManyVersion.mockResolvedValue({ count: 0 });
    await expect(resetVersion(makeVersion(), "user-a")).rejects.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const findFirstCustomPrompt = vi.fn();
const findUniqueCustomPrompt = vi.fn();
const createCustomPrompt = vi.fn();
const requireUser = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customPrompt: {
      findFirst: (...args: unknown[]) => findFirstCustomPrompt(...args),
      findUnique: (...args: unknown[]) => findUniqueCustomPrompt(...args),
      create: (...args: unknown[]) => createCustomPrompt(...args),
    },
  },
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

const { POST } = await import("@/app/api/gallery/prompts/[promptId]/copy/route");

function callCopy(promptId: string) {
  return POST({} as NextRequest, { params: Promise.resolve({ promptId }) });
}

beforeEach(() => {
  findFirstCustomPrompt.mockReset();
  findUniqueCustomPrompt.mockReset();
  createCustomPrompt.mockReset();
  requireUser.mockReset();
});

describe("POST /api/gallery/prompts/[promptId]/copy", () => {
  it("creates an independent prompt record owned by the copying user", async () => {
    requireUser.mockResolvedValue({ id: "user-b" });
    findFirstCustomPrompt.mockResolvedValue({
      id: "shared-1",
      creatorId: "user-a",
      text: "Make headings bold",
      description: "Bolds section headings",
      isShared: true,
    });
    findUniqueCustomPrompt.mockResolvedValue(null);
    createCustomPrompt.mockResolvedValue({
      id: "copy-1",
      creatorId: "user-b",
      text: "Make headings bold",
      description: "Bolds section headings",
      isShared: false,
      copiedFromId: "shared-1",
    });

    const res = await callCopy("shared-1");
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.prompt.creatorId).toBe("user-b");
    expect(body.prompt.copiedFromId).toBe("shared-1");
    expect(body.prompt.isShared).toBe(false);
    expect(createCustomPrompt).toHaveBeenCalledWith({
      data: {
        creatorId: "user-b",
        text: "Make headings bold",
        description: "Bolds section headings",
        isShared: false,
        copiedFromId: "shared-1",
      },
    });
  });

  it("returns the existing copy instead of creating a duplicate on a second copy", async () => {
    requireUser.mockResolvedValue({ id: "user-b" });
    findFirstCustomPrompt.mockResolvedValue({ id: "shared-1", creatorId: "user-a", isShared: true });
    findUniqueCustomPrompt.mockResolvedValue({ id: "copy-1", creatorId: "user-b", copiedFromId: "shared-1" });

    const res = await callCopy("shared-1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadyCopied).toBe(true);
    expect(createCustomPrompt).not.toHaveBeenCalled();
  });

  it("refuses to let a user 'copy' their own shared prompt", async () => {
    requireUser.mockResolvedValue({ id: "user-a" });
    findFirstCustomPrompt.mockResolvedValue({ id: "shared-1", creatorId: "user-a", isShared: true });

    const res = await callCopy("shared-1");
    expect(res.status).toBe(409);
    expect(createCustomPrompt).not.toHaveBeenCalled();
  });

  it("returns 404 for a prompt that isn't shared (can't copy a private prompt)", async () => {
    requireUser.mockResolvedValue({ id: "user-b" });
    findFirstCustomPrompt.mockResolvedValue(null); // the `isShared: true` filter excludes it

    const res = await callCopy("private-1");
    expect(res.status).toBe(404);
  });
});

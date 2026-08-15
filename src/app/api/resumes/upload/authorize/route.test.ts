import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/errors";

const requireUser = vi.fn();
const enforceGenerationRateLimit = vi.fn();
const handleUpload = vi.fn();

vi.mock("@/lib/auth/current-user", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceGenerationRateLimit: (...args: unknown[]) => enforceGenerationRateLimit(...args),
}));

vi.mock("@vercel/blob/client", () => ({
  handleUpload: (...args: unknown[]) => handleUpload(...args),
}));

const { POST } = await import("@/app/api/resumes/upload/authorize/route");

function callAuthorize(body: Record<string, unknown>) {
  return POST({ json: async () => body } as unknown as NextRequest, { params: Promise.resolve({}) });
}

beforeEach(() => {
  requireUser.mockReset();
  enforceGenerationRateLimit.mockReset();
  handleUpload.mockReset();
  enforceGenerationRateLimit.mockResolvedValue(undefined);
});

describe("POST /api/resumes/upload/authorize", () => {
  it("rejects an unauthenticated request before ever calling handleUpload", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());

    const res = await callAuthorize({ type: "blob.generate-client-token", payload: {} });

    expect(res.status).toBe(401);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("rejects a client-chosen pathname outside the caller's own prefix", async () => {
    requireUser.mockResolvedValue({ id: "user-1" });
    handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      await onBeforeGenerateToken("resumes/someone-else/abc-resume.pdf", null, false);
      return { type: "blob.generate-client-token", clientToken: "unused" };
    });

    const res = await callAuthorize({
      type: "blob.generate-client-token",
      payload: { pathname: "resumes/someone-else/abc-resume.pdf", multipart: false, clientPayload: null },
    });

    expect(res.status).toBe(400);
  });

  it("issues a token for a pathname under the caller's own prefix", async () => {
    requireUser.mockResolvedValue({ id: "user-1" });
    handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const constraints = await onBeforeGenerateToken("resumes/user-1/abc-resume.pdf", null, false);
      expect(constraints.allowedContentTypes).toContain("application/pdf");
      expect(constraints.maximumSizeInBytes).toBeGreaterThan(0);
      return { type: "blob.generate-client-token", clientToken: "token-value" };
    });

    const res = await callAuthorize({
      type: "blob.generate-client-token",
      payload: { pathname: "resumes/user-1/abc-resume.pdf", multipart: false, clientPayload: null },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.clientToken).toBe("token-value");
    expect(enforceGenerationRateLimit).toHaveBeenCalledWith("user-1");
  });
});

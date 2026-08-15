import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const requireUser = vi.fn();
const findUniqueResume = vi.fn();
const findFirstResume = vi.fn();
const createResume = vi.fn();
const deleteResume = vi.fn();
const readStorageObject = vi.fn();
const deleteStorageObject = vi.fn();
const extractResumeText = vi.fn();
const createFormattedVersion = vi.fn();
const enforceGenerationRateLimit = vi.fn();

class FakePrismaKnownRequestError extends Error {
  code: string;
  constructor(code: string) {
    super("Prisma known request error");
    this.code = code;
  }
}

vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: FakePrismaKnownRequestError },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    resume: {
      findUnique: (...args: unknown[]) => findUniqueResume(...args),
      findFirst: (...args: unknown[]) => findFirstResume(...args),
      create: (...args: unknown[]) => createResume(...args),
      delete: (...args: unknown[]) => deleteResume(...args),
    },
  },
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

vi.mock("@/lib/storage/blob", () => ({
  readStorageObject: (...args: unknown[]) => readStorageObject(...args),
  deleteStorageObject: (...args: unknown[]) => deleteStorageObject(...args),
}));

vi.mock("@/lib/files/extract", () => ({
  extractResumeText: (...args: unknown[]) => extractResumeText(...args),
}));

vi.mock("@/lib/services/resume-format", () => ({
  createFormattedVersion: (...args: unknown[]) => createFormattedVersion(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceGenerationRateLimit: (...args: unknown[]) => enforceGenerationRateLimit(...args),
}));

const { POST } = await import("@/app/api/resumes/finalize/route");

function callFinalize(body: Record<string, unknown>) {
  return POST(
    { json: async () => body, nextUrl: { pathname: "/api/resumes/finalize" }, method: "POST" } as unknown as NextRequest,
    { params: Promise.resolve({}) },
  );
}

const PDF_BUFFER = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(64, 0x41)]);

beforeEach(() => {
  requireUser.mockReset();
  findUniqueResume.mockReset();
  findFirstResume.mockReset();
  createResume.mockReset();
  deleteResume.mockReset();
  readStorageObject.mockReset();
  deleteStorageObject.mockReset();
  extractResumeText.mockReset();
  createFormattedVersion.mockReset();
  enforceGenerationRateLimit.mockReset();
  requireUser.mockResolvedValue({ id: "user-1" });
  enforceGenerationRateLimit.mockResolvedValue(undefined);
  deleteStorageObject.mockResolvedValue(undefined);
});

describe("POST /api/resumes/finalize", () => {
  it("rejects a pathname outside the caller's own storage prefix without touching storage", async () => {
    const res = await callFinalize({
      pathname: "resumes/someone-else/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });

    expect(res.status).toBe(404);
    expect(readStorageObject).not.toHaveBeenCalled();
    expect(findUniqueResume).not.toHaveBeenCalled();
  });

  it("returns 404 when the referenced upload doesn't exist in storage", async () => {
    findUniqueResume.mockResolvedValue(null);
    readStorageObject.mockResolvedValue(null);

    const res = await callFinalize({
      pathname: "resumes/user-1/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });

    expect(res.status).toBe(404);
    expect(extractResumeText).not.toHaveBeenCalled();
  });

  it("replays a prior successful finalize for the same object instead of reprocessing", async () => {
    findUniqueResume.mockResolvedValue({
      id: "resume-1",
      title: "My resume",
      createdAt: new Date("2026-01-01"),
      versions: [{ id: "version-1", name: "Version 1" }],
    });

    const res = await callFinalize({
      pathname: "resumes/user-1/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.version.id).toBe("version-1");
    expect(readStorageObject).not.toHaveBeenCalled();
    expect(createResume).not.toHaveBeenCalled();
    expect(enforceGenerationRateLimit).not.toHaveBeenCalled();
  });

  it("rejects content that doesn't match its claimed file type and cleans up the blob", async () => {
    findUniqueResume.mockResolvedValue(null);
    readStorageObject.mockResolvedValue({
      buffer: Buffer.from("this is not a pdf"),
      contentType: "application/pdf",
    });

    const res = await callFinalize({
      pathname: "resumes/user-1/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });

    expect(res.status).toBe(400);
    expect(deleteStorageObject).toHaveBeenCalledWith("resumes/user-1/abc-resume.pdf");
    expect(createResume).not.toHaveBeenCalled();
  });

  it("validates real content, extracts text, and creates the formatted version on success", async () => {
    findUniqueResume.mockResolvedValue(null);
    findFirstResume.mockResolvedValue(null);
    readStorageObject.mockResolvedValue({ buffer: PDF_BUFFER, contentType: "application/pdf" });
    extractResumeText.mockResolvedValue("Jane Doe\nSoftware Engineer");
    createResume.mockResolvedValue({ id: "resume-1", title: "My resume", createdAt: new Date("2026-01-01") });
    createFormattedVersion.mockResolvedValue({ id: "version-1", name: "Version 1" });

    const res = await callFinalize({
      pathname: "resumes/user-1/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.version.id).toBe("version-1");
    expect(enforceGenerationRateLimit).toHaveBeenCalledWith("user-1");
    expect(createResume).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storageKey: "resumes/user-1/abc-resume.pdf" }) }),
    );
  });

  it("returns the winning concurrent finalize's result on a unique-constraint race instead of erroring", async () => {
    findUniqueResume
      .mockResolvedValueOnce(null) // pre-check: no existing resume yet
      .mockResolvedValueOnce({
        id: "resume-1",
        title: "My resume",
        createdAt: new Date("2026-01-01"),
        versions: [{ id: "version-1", name: "Version 1" }],
      }); // lookup after losing the create race
    findFirstResume.mockResolvedValue(null);
    readStorageObject.mockResolvedValue({ buffer: PDF_BUFFER, contentType: "application/pdf" });
    extractResumeText.mockResolvedValue("Jane Doe\nSoftware Engineer");
    createResume.mockRejectedValue(new FakePrismaKnownRequestError("P2002"));

    const res = await callFinalize({
      pathname: "resumes/user-1/abc-resume.pdf",
      filename: "resume.pdf",
      title: "My resume",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.version.id).toBe("version-1");
    expect(createFormattedVersion).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const requireUser = vi.fn();
const findFirstVersion = vi.fn();
const createChecklistRun = vi.fn();
const findFirstChecklistRun = vi.fn();
const updateGenerationRun = vi.fn();
const updateResume = vi.fn();
const reserveGenerationRun = vi.fn();
const runChecklistEvaluation = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    resumeVersion: { findFirst: (...args: unknown[]) => findFirstVersion(...args) },
    checklistRun: {
      create: (...args: unknown[]) => createChecklistRun(...args),
      findFirst: (...args: unknown[]) => findFirstChecklistRun(...args),
    },
    generationRun: { update: (...args: unknown[]) => updateGenerationRun(...args) },
    resume: { update: (...args: unknown[]) => updateResume(...args) },
  },
}));
vi.mock("@/lib/auth/current-user", () => ({ requireUser: (...args: unknown[]) => requireUser(...args) }));
vi.mock("@/lib/rate-limit", () => ({ reserveGenerationRun: (...args: unknown[]) => reserveGenerationRun(...args) }));
vi.mock("@/lib/checklist/evaluate", () => ({ runChecklistEvaluation: (...args: unknown[]) => runChecklistEvaluation(...args) }));

const { POST, GET } = await import("@/app/api/versions/[versionId]/checklist/route");

function call(handler: typeof POST, versionId: string) {
  return handler({} as NextRequest, { params: Promise.resolve({ versionId }) });
}

beforeEach(() => {
  requireUser.mockReset();
  findFirstVersion.mockReset();
  createChecklistRun.mockReset();
  findFirstChecklistRun.mockReset();
  updateGenerationRun.mockReset();
  updateResume.mockReset();
  reserveGenerationRun.mockReset();
  runChecklistEvaluation.mockReset();
});

describe("POST /api/versions/[versionId]/checklist", () => {
  it("runs the evaluation, persists a ChecklistRun, and returns it", async () => {
    requireUser.mockResolvedValue({ id: "user-1" });
    findFirstVersion.mockResolvedValue({
      id: "version-1",
      contentJson: { basics: { fullName: "Jordan Alvarez", links: [] }, education: [], experience: [], projects: [], skills: [], certifications: [], awards: [], additional: [] },
      styleJson: {},
      resume: { id: "resume-1", sourceText: "Jordan Alvarez resume text", mimeType: "application/pdf" },
    });
    reserveGenerationRun.mockResolvedValue({ id: "gen-run-1" });
    runChecklistEvaluation.mockResolvedValue({ overallStatus: "passed", items: [{ id: "TYPO-002", status: "passed", detail: "ok", category: "typos", label: "Duplicate words", kind: "mechanical" }] });
    createChecklistRun.mockResolvedValue({ id: "run-1", versionId: "version-1", overallStatus: "passed", resultsJson: [], createdAt: new Date() });

    const res = await call(POST, "version-1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.run.overallStatus).toBe("passed");
    expect(createChecklistRun).toHaveBeenCalled();
    expect(updateGenerationRun).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }));
  });

  it("returns 404 for a version the user doesn't own", async () => {
    requireUser.mockResolvedValue({ id: "user-1" });
    findFirstVersion.mockResolvedValue(null);
    const res = await call(POST, "not-mine");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/versions/[versionId]/checklist", () => {
  it("returns the latest stored run, or null if none exists yet", async () => {
    requireUser.mockResolvedValue({ id: "user-1" });
    findFirstVersion.mockResolvedValue({ id: "version-1" });
    findFirstChecklistRun.mockResolvedValue(null);
    const res = await call(GET, "version-1");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.run).toBeNull();
  });
});

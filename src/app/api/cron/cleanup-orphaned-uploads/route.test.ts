import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listResumeSourceObjects = vi.fn();
const deleteStorageObject = vi.fn();
const findManyResume = vi.fn();

vi.mock("@/lib/storage/blob", () => ({
  listResumeSourceObjects: (...args: unknown[]) => listResumeSourceObjects(...args),
  deleteStorageObject: (...args: unknown[]) => deleteStorageObject(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: { resume: { findMany: (...args: unknown[]) => findManyResume(...args) } },
}));

const { GET } = await import("@/app/api/cron/cleanup-orphaned-uploads/route");

function callCron(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return GET(new Request("http://localhost/api/cron/cleanup-orphaned-uploads", { headers }));
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();

beforeEach(() => {
  listResumeSourceObjects.mockReset();
  deleteStorageObject.mockReset();
  findManyResume.mockReset();
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/cleanup-orphaned-uploads", () => {
  it("rejects a request without the correct bearer secret", async () => {
    const res = await callCron("wrong-secret");
    expect(res.status).toBe(401);
    expect(listResumeSourceObjects).not.toHaveBeenCalled();
  });

  it("rejects a request with no secret configured at all", async () => {
    delete process.env.CRON_SECRET;
    const res = await callCron("test-cron-secret");
    expect(res.status).toBe(401);
  });

  it("deletes only objects that are both unlinked to any Resume and past the age threshold", async () => {
    listResumeSourceObjects.mockResolvedValue([
      // Orphaned and old enough — should be deleted.
      { pathname: "resumes/user-1/old-orphan.pdf", uploadedAt: new Date(now - 48 * HOUR) },
      // Orphaned but too recent — likely mid-flight, must be left alone.
      { pathname: "resumes/user-1/fresh-orphan.pdf", uploadedAt: new Date(now - 1 * HOUR) },
      // Linked to a real Resume, regardless of age — must never be touched.
      { pathname: "resumes/user-1/linked.pdf", uploadedAt: new Date(now - 72 * HOUR) },
    ]);
    findManyResume.mockResolvedValue([{ storageKey: "resumes/user-1/linked.pdf" }]);
    deleteStorageObject.mockResolvedValue(undefined);

    const res = await callCron("test-cron-secret");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(deleteStorageObject).toHaveBeenCalledTimes(1);
    expect(deleteStorageObject).toHaveBeenCalledWith("resumes/user-1/old-orphan.pdf");
    expect(body).toEqual({ scanned: 3, orphaned: 1, deleted: 1, failed: 0 });
  });

  it("reports a failed deletion without throwing, and doesn't count it as deleted", async () => {
    listResumeSourceObjects.mockResolvedValue([
      { pathname: "resumes/user-1/old-orphan.pdf", uploadedAt: new Date(now - 48 * HOUR) },
    ]);
    findManyResume.mockResolvedValue([]);
    deleteStorageObject.mockRejectedValue(new Error("blob store unavailable"));

    const res = await callCron("test-cron-secret");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ scanned: 1, orphaned: 1, deleted: 0, failed: 1 });
  });
});

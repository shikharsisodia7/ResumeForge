import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitError } from "@/lib/errors";

const generationRunCount = vi.fn();
const generationRunCreate = vi.fn();
const queryRaw = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const { reserveGenerationRun } = await import("@/lib/rate-limit");

/** A fake transaction client, matching what prisma.$transaction hands the callback. */
function fakeTx() {
  return {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
    generationRun: {
      count: (...args: unknown[]) => generationRunCount(...args),
      create: (...args: unknown[]) => generationRunCreate(...args),
    },
  };
}

beforeEach(() => {
  generationRunCount.mockReset();
  generationRunCreate.mockReset();
  queryRaw.mockReset();
  transaction.mockReset();
  queryRaw.mockResolvedValue([{ acquired: true }]);
  transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(fakeTx()));
});

describe("reserveGenerationRun", () => {
  it("acquires the per-user advisory lock before counting, inside one transaction", async () => {
    generationRunCount.mockResolvedValue(0);
    generationRunCreate.mockResolvedValue({ id: "run-1" });

    await reserveGenerationRun({
      userId: "user-1",
      resumeId: "resume-1",
      operation: "FORMAT",
      modelId: "gpt-4.1",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    // The lock must be taken before the count that decides admission,
    // otherwise a concurrent reservation could still slip in between them.
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(generationRunCount.mock.invocationCallOrder[0]);
  });

  it("rejects without creating a row if the lock is still held by a concurrent reservation after every retry", async () => {
    queryRaw.mockResolvedValue([{ acquired: false }]);

    await expect(
      reserveGenerationRun({
        userId: "user-1",
        resumeId: "resume-1",
        operation: "FORMAT",
        modelId: "gpt-4.1",
      }),
    ).rejects.toBeInstanceOf(RateLimitError);

    // Bounded retries, not an unbounded/blocking wait — must give up eventually.
    expect(queryRaw.mock.calls.length).toBeGreaterThan(1);
    expect(generationRunCount).not.toHaveBeenCalled();
    expect(generationRunCreate).not.toHaveBeenCalled();
  });

  it("succeeds once the lock frees up within the retry window, without spuriously rejecting on the first miss", async () => {
    queryRaw
      .mockResolvedValueOnce([{ acquired: false }])
      .mockResolvedValueOnce([{ acquired: false }])
      .mockResolvedValueOnce([{ acquired: true }]);
    generationRunCount.mockResolvedValue(0);
    generationRunCreate.mockResolvedValue({ id: "run-4" });

    const run = await reserveGenerationRun({
      userId: "user-1",
      resumeId: "resume-1",
      operation: "FORMAT",
      modelId: "gpt-4.1",
    });

    expect(run.id).toBe("run-4");
    expect(queryRaw).toHaveBeenCalledTimes(3);
  });

  it("creates the PENDING run and returns its id when under the limit", async () => {
    generationRunCount.mockResolvedValue(3);
    generationRunCreate.mockResolvedValue({ id: "run-2" });

    const run = await reserveGenerationRun({
      userId: "user-1",
      resumeId: "resume-1",
      operation: "CUSTOMIZE",
      modelId: "gpt-4.1",
      maxPerWindow: 10,
    });

    expect(run.id).toBe("run-2");
    expect(generationRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", userId: "user-1" }) }),
    );
  });

  it("rejects without creating a row once the window's count is at the limit", async () => {
    generationRunCount.mockResolvedValue(10);

    await expect(
      reserveGenerationRun({
        userId: "user-1",
        resumeId: "resume-1",
        operation: "TAILOR",
        modelId: "gpt-4.1",
        maxPerWindow: 10,
      }),
    ).rejects.toBeInstanceOf(RateLimitError);

    expect(generationRunCreate).not.toHaveBeenCalled();
  });

  it("scopes the count and the insert to the same user's window inside the single transaction", async () => {
    generationRunCount.mockResolvedValue(0);
    generationRunCreate.mockResolvedValue({ id: "run-3" });

    await reserveGenerationRun({
      userId: "user-42",
      resumeId: "resume-9",
      versionId: "version-9",
      operation: "FORMAT",
      modelId: "gpt-4.1",
    });

    expect(generationRunCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-42" }) }),
    );
    expect(generationRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-42", resumeId: "resume-9", versionId: "version-9" }),
      }),
    );
  });
});

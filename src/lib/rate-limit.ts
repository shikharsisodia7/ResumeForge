import type { GenerationOperation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

/**
 * A simple database-backed rate limiter for AI-cost operations (upload,
 * format, customize, tailor). We already log every AI call to
 * `GenerationRun`, so counting recent rows is enough — no separate cache
 * infrastructure needed for this app's scale.
 *
 * This is a best-effort, non-atomic check only — use it for early UX
 * rejection (e.g. before letting the browser start an upload). It must
 * never be the only gate before something that creates a `GenerationRun`;
 * see {@link reserveGenerationRun} for the atomic version of that.
 */
export async function enforceGenerationRateLimit(
  userId: string,
  options: { windowMs?: number; maxPerWindow?: number } = {},
): Promise<void> {
  const windowMs = options.windowMs ?? 60_000;
  const maxPerWindow = options.maxPerWindow ?? 10;
  const since = new Date(Date.now() - windowMs);

  const count = await prisma.generationRun.count({
    where: { userId, createdAt: { gte: since } },
  });

  if (count >= maxPerWindow) {
    throw new RateLimitError();
  }
}

export interface ReserveGenerationRunParams {
  userId: string;
  resumeId: string;
  versionId?: string;
  operation: GenerationOperation;
  modelId: string;
  promptHash?: string;
  windowMs?: number;
  maxPerWindow?: number;
}

/**
 * Atomically checks the per-user generation rate limit and reserves a slot
 * by creating the PENDING `GenerationRun` row in the same transaction,
 * serialized by a Postgres advisory lock scoped to the user.
 *
 * A plain "count existing rows, then insert a new one later" has a
 * check-then-act race: two concurrent requests from the same user can both
 * count N-of-limit rows and both proceed before either has inserted,
 * together exceeding the limit. `pg_try_advisory_xact_lock` (scoped to the
 * transaction's lifetime) forces concurrent reservations for the same user
 * to run one at a time, so the count each one sees always reflects every
 * reservation that's already committed.
 *
 * Acquiring is a short, bounded retry loop around the non-blocking `_try_`
 * variant, not a single attempt and not a blocking wait — both extremes
 * were tried and measured against real Postgres before landing here:
 *   - A single `pg_try_advisory_xact_lock` attempt with no retry rejects
 *     too eagerly: firing 25 genuinely simultaneous requests for one user
 *     (well within normal multi-tab/double-click territory) left only 2
 *     acquiring the lock on their first try — 23 spurious rejections, none
 *     of them actually over the intended limit.
 *   - A single blocking `pg_advisory_xact_lock` call queues correctly for
 *     modest contention, but the same 25-way burst reproduced later-queued
 *     transactions blowing past Prisma's 5s interactive-transaction
 *     timeout — a raw 500 instead of a clean 429.
 * A short poll (a handful of attempts a few tens of milliseconds apart,
 * capped well under that 5s ceiling) resolves ordinary contention exactly
 * like the blocking lock would, while still failing cleanly and fast under
 * a pathological burst instead of surfacing a raw transaction-timeout
 * error.
 *
 * The transaction spans only the lock + count + insert — a few
 * milliseconds of local DB work — never the AI call that follows. Holding
 * it across a slow external API call would serialize a user's legitimate
 * concurrent requests behind each other for no reason; this only ever
 * needs to be atomic with the *reservation*, not the work.
 */
const LOCK_ACQUIRE_ATTEMPTS = 8;
const LOCK_ACQUIRE_RETRY_DELAY_MS = 40;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function reserveGenerationRun(
  params: ReserveGenerationRunParams,
): Promise<{ id: string }> {
  const { userId, resumeId, versionId, operation, modelId, promptHash, windowMs, maxPerWindow } = params;
  const effectiveWindowMs = windowMs ?? 60_000;
  const effectiveMaxPerWindow = maxPerWindow ?? 10;
  const since = new Date(Date.now() - effectiveWindowMs);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let acquired = false;
    for (let attempt = 0; attempt < LOCK_ACQUIRE_ATTEMPTS && !acquired; attempt++) {
      if (attempt > 0) await sleep(LOCK_ACQUIRE_RETRY_DELAY_MS);
      const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext(${userId})) AS acquired
      `;
      acquired = lock?.acquired ?? false;
    }
    if (!acquired) {
      throw new RateLimitError();
    }

    const count = await tx.generationRun.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (count >= effectiveMaxPerWindow) {
      throw new RateLimitError();
    }

    return tx.generationRun.create({
      data: { userId, resumeId, versionId, operation, modelId, status: "PENDING", promptHash },
      select: { id: true },
    });
  });
}

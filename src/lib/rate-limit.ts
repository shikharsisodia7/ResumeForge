import { prisma } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

/**
 * A simple database-backed rate limiter for AI-cost operations (upload,
 * format, customize, tailor). We already log every AI call to
 * `GenerationRun`, so counting recent rows is enough — no separate cache
 * infrastructure needed for this app's scale.
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

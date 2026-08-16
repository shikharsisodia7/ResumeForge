import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { customizeVersionSchema } from "@/lib/schemas/requests";
import { customizeVersion } from "@/lib/services/version-customize";

export const POST = apiRoute(async (request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  // Rate limit is enforced atomically inside customizeVersion (see
  // reserveGenerationRun) — a separate check-then-act call here would race
  // against concurrent requests instead of closing the gap.
  const body = customizeVersionSchema.parse(await request.json());
  const result = await customizeVersion(version, user.id, body);

  return NextResponse.json({
    rejected: result.rejected,
    explanation: result.explanation,
    version: result.version,
  });
});

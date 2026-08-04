import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { customizeVersionSchema } from "@/lib/schemas/requests";
import { customizeVersion } from "@/lib/services/version-customize";

export const POST = apiRoute(async (request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);
  await enforceGenerationRateLimit(user.id);

  const body = customizeVersionSchema.parse(await request.json());
  const result = await customizeVersion(version, user.id, body);

  return NextResponse.json({
    rejected: result.rejected,
    explanation: result.explanation,
    version: result.version,
  });
});

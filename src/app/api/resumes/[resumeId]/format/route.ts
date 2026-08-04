import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedResume } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { createFormattedVersion } from "@/lib/services/resume-format";

export const POST = apiRoute(async (_request, ctx) => {
  const { resumeId } = await ctx.params;
  const user = await requireUser();
  const resume = await requireOwnedResume(resumeId, user.id);
  await enforceGenerationRateLimit(user.id);

  const version = await createFormattedVersion(resume, user.id);

  return NextResponse.json({ version }, { status: 201 });
});

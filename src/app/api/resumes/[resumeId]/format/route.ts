import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedResume } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { createFormattedVersion } from "@/lib/services/resume-format";

export const POST = apiRoute(async (_request, ctx) => {
  const { resumeId } = await ctx.params;
  const user = await requireUser();
  const resume = await requireOwnedResume(resumeId, user.id);

  // Rate limit is enforced atomically inside createFormattedVersion (see
  // reserveGenerationRun) — a separate check-then-act call here would race
  // against concurrent requests instead of closing the gap.
  const version = await createFormattedVersion(resume, user.id);

  return NextResponse.json({ version }, { status: 201 });
});

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedResume } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { createVersionSchema } from "@/lib/schemas/requests";
import { duplicateVersion } from "@/lib/services/version-duplicate";

export const POST = apiRoute(async (request, ctx) => {
  const { resumeId } = await ctx.params;
  const user = await requireUser();
  const resume = await requireOwnedResume(resumeId, user.id);

  const body = createVersionSchema.parse(await request.json());

  const sourceVersion = await prisma.resumeVersion.findFirst({
    where: { id: body.sourceVersionId, resumeId: resume.id },
  });
  if (!sourceVersion) throw new NotFoundError("Source version not found");

  if (body.jobDescription) {
    await enforceGenerationRateLimit(user.id);
  }

  const version = await duplicateVersion({
    sourceVersion: { ...sourceVersion, resume },
    userId: user.id,
    name: body.name,
    targetCompany: body.targetCompany,
    targetRole: body.targetRole,
    jobDescription: body.jobDescription,
  });

  return NextResponse.json({ version }, { status: 201 });
});

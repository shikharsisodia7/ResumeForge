import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { reserveGenerationRun } from "@/lib/rate-limit";
import { runChecklistEvaluation } from "@/lib/checklist/evaluate";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";
import { sha256Hex } from "@/lib/files/hash";

export const POST = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const content = resumeContentSchema.parse(version.contentJson);
  const style = resumeStyleSchema.parse(version.styleJson);

  const run = await reserveGenerationRun({
    userId: user.id,
    resumeId: version.resume.id,
    versionId: version.id,
    operation: "CHECKLIST",
    modelId: AI_MODEL_ID,
    promptHash: sha256Hex(`${version.revision}:${version.resume.sourceText}`),
  });

  try {
    const evaluation = await runChecklistEvaluation({
      content,
      style,
      sourceText: version.resume.sourceText,
      resume: { mimeType: version.resume.mimeType },
    });

    const checklistRun = await prisma.checklistRun.create({
      data: {
        versionId: version.id,
        resultsJson: evaluation.items as object,
        overallStatus: evaluation.overallStatus,
      },
    });

    await prisma.generationRun.update({ where: { id: run.id }, data: { status: "SUCCESS" } });

    return NextResponse.json({ run: checklistRun });
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: "FAILURE", errorMessage: error instanceof Error ? error.message : "Unknown error" },
    });
    throw error;
  }
});

export const GET = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  await requireOwnedVersion(versionId, user.id);

  const run = await prisma.checklistRun.findFirst({
    where: { versionId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ run });
});

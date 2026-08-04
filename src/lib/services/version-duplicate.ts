import type { Resume, ResumeVersion } from "@prisma/client";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { runTailoring } from "@/lib/ai/tailor";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { sha256Hex } from "@/lib/files/hash";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";

/**
 * Creates a new version from an existing one. When a job description is
 * supplied this runs a truthful tailoring pass first; otherwise it's a
 * plain, instant duplicate. The new version's own copied content becomes
 * its `base` — resetting a tailored version returns to the tailored
 * starting point, not the resume's original upload.
 */
export async function duplicateVersion(params: {
  sourceVersion: ResumeVersion & { resume: Resume };
  userId: string;
  name: string;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}): Promise<ResumeVersion> {
  const { sourceVersion, userId, name, targetCompany, targetRole, jobDescription } = params;

  const sourceContent = resumeContentSchema.parse(sourceVersion.contentJson);
  const sourceStyle = resumeStyleSchema.parse(sourceVersion.styleJson);

  if (!jobDescription) {
    return prisma.resumeVersion.create({
      data: {
        resumeId: sourceVersion.resumeId,
        name,
        targetCompany,
        targetRole,
        parentVersionId: sourceVersion.id,
        contentJson: sourceContent,
        styleJson: sourceStyle,
        baseContentJson: sourceContent,
        baseStyleJson: sourceStyle,
        revision: 1,
      },
    });
  }

  const claimed = await prisma.resume.updateMany({
    where: { id: sourceVersion.resumeId, isProcessing: false },
    data: { isProcessing: true },
  });
  if (claimed.count === 0) {
    throw new ConflictError("This resume is already being processed");
  }

  const run = await prisma.generationRun.create({
    data: {
      userId,
      resumeId: sourceVersion.resumeId,
      operation: "TAILOR",
      modelId: AI_MODEL_ID,
      status: "PENDING",
      promptHash: sha256Hex(jobDescription),
    },
  });

  try {
    const { content } = await runTailoring({
      baseContent: sourceContent,
      targetCompany,
      targetRole,
      jobDescription,
    });

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.resumeVersion.create({
        data: {
          resumeId: sourceVersion.resumeId,
          name,
          targetCompany,
          targetRole,
          jobDescription,
          parentVersionId: sourceVersion.id,
          contentJson: content,
          styleJson: sourceStyle,
          baseContentJson: content,
          baseStyleJson: sourceStyle,
          revision: 1,
        },
      });
      await tx.generationRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", versionId: created.id },
      });
      await tx.resume.update({ where: { id: sourceVersion.resumeId }, data: { isProcessing: false } });
      return created;
    });

    return version;
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILURE",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    await prisma.resume.update({ where: { id: sourceVersion.resumeId }, data: { isProcessing: false } });
    throw error;
  }
}

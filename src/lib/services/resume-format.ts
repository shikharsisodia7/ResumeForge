import type { Resume, ResumeVersion } from "@prisma/client";
import { runExtraction } from "@/lib/ai/extraction";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { reserveGenerationRun } from "@/lib/rate-limit";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { sha256Hex } from "@/lib/files/hash";

/**
 * Extracts structured content from a resume's source text and creates a new
 * formatted `ResumeVersion` from it. Used both by the upload flow (first
 * version) and the standalone `/format` endpoint (fresh reformats).
 */
export async function createFormattedVersion(resume: Resume, userId: string): Promise<ResumeVersion> {
  const claimed = await prisma.resume.updateMany({
    where: { id: resume.id, isProcessing: false },
    data: { isProcessing: true },
  });
  if (claimed.count === 0) {
    throw new ConflictError("This resume is already being processed");
  }

  let run: { id: string };
  try {
    run = await reserveGenerationRun({
      userId,
      resumeId: resume.id,
      operation: "FORMAT",
      modelId: AI_MODEL_ID,
      promptHash: sha256Hex(resume.sourceText),
    });
  } catch (error) {
    await prisma.resume.update({ where: { id: resume.id }, data: { isProcessing: false } });
    throw error;
  }

  try {
    const content = await runExtraction(resume.sourceText);
    const existingCount = await prisma.resumeVersion.count({ where: { resumeId: resume.id } });

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.resumeVersion.create({
        data: {
          resumeId: resume.id,
          name: `Version ${existingCount + 1}`,
          contentJson: content,
          styleJson: DEFAULT_RESUME_STYLE,
          baseContentJson: content,
          baseStyleJson: DEFAULT_RESUME_STYLE,
          revision: 1,
        },
      });
      await tx.generationRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", versionId: created.id },
      });
      await tx.resume.update({ where: { id: resume.id }, data: { isProcessing: false } });
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
    await prisma.resume.update({ where: { id: resume.id }, data: { isProcessing: false } });
    throw error;
  }
}

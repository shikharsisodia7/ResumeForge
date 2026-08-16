import type { Resume, ResumeVersion } from "@prisma/client";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { runCustomization } from "@/lib/ai/customize";
import { requireOwnedPrompt } from "@/lib/auth/ownership";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { reserveGenerationRun } from "@/lib/rate-limit";
import { sha256Hex } from "@/lib/files/hash";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";

type OwnedVersion = ResumeVersion & { resume: Resume };

export interface CustomizeVersionResult {
  rejected: boolean;
  explanation: string;
  version: ResumeVersion;
}

/**
 * Applies either a raw instruction or an already-saved prompt to a version.
 * Every successful mutation snapshots the pre-change state into the
 * `previous*` fields (for undo) and bumps `revision` — a failed AI call or
 * failed fabrication check never touches the stored content or style.
 */
export async function customizeVersion(
  version: OwnedVersion,
  userId: string,
  input: { instruction: string } | { promptId: string },
): Promise<CustomizeVersionResult> {
  const claimed = await prisma.resumeVersion.updateMany({
    where: { id: version.id, isProcessing: false },
    data: { isProcessing: true },
  });
  if (claimed.count === 0) {
    throw new ConflictError("This version is already being updated");
  }

  let instructionText: string;
  let appliedPromptId: string | null = null;
  try {
    if ("promptId" in input) {
      const prompt = await requireOwnedPrompt(input.promptId, userId);
      instructionText = prompt.text;
      appliedPromptId = prompt.id;
    } else {
      instructionText = input.instruction;
    }
  } catch (error) {
    await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
    throw error;
  }

  let run: { id: string };
  try {
    run = await reserveGenerationRun({
      userId,
      resumeId: version.resumeId,
      versionId: version.id,
      operation: "CUSTOMIZE",
      modelId: AI_MODEL_ID,
      promptHash: sha256Hex(instructionText),
    });
  } catch (error) {
    await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
    throw error;
  }

  try {
    const baseContent = resumeContentSchema.parse(version.baseContentJson);
    const currentContent = resumeContentSchema.parse(version.contentJson);
    const currentStyle = resumeStyleSchema.parse(version.styleJson);

    const outcome = await runCustomization({
      baseContent,
      currentContent,
      currentStyle,
      instruction: instructionText,
    });

    if (outcome.rejected) {
      await prisma.generationRun.update({ where: { id: run.id }, data: { status: "SUCCESS" } });
      await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
      return { rejected: true, explanation: outcome.explanation, version };
    }

    const nextContent = outcome.content ?? currentContent;
    const nextStyle = outcome.style ?? currentStyle;

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.resumeVersion.update({
        where: { id: version.id },
        data: {
          previousContentJson: version.contentJson as object,
          previousStyleJson: version.styleJson as object,
          previousRevision: version.revision,
          contentJson: nextContent,
          styleJson: nextStyle,
          revision: { increment: 1 },
          isProcessing: false,
        },
      });

      if (appliedPromptId) {
        const maxOrder = await tx.versionPrompt.aggregate({
          where: { versionId: version.id },
          _max: { order: true },
        });
        await tx.versionPrompt.upsert({
          where: { versionId_promptId: { versionId: version.id, promptId: appliedPromptId } },
          update: { isActive: true },
          create: {
            versionId: version.id,
            promptId: appliedPromptId,
            order: (maxOrder._max.order ?? -1) + 1,
            isActive: true,
          },
        });
      }

      await tx.generationRun.update({ where: { id: run.id }, data: { status: "SUCCESS" } });
      return saved;
    });

    return { rejected: false, explanation: outcome.explanation, version: updated };
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILURE",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
    throw error;
  }
}

import type { Resume, ResumeVersion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";

type OwnedVersion = ResumeVersion & { resume: Resume };

/**
 * Restores a version to its immutable base (post-initial-format) content and
 * style, and deactivates — but does not delete — every prompt currently
 * applied to it, so the user's saved prompts remain in their library.
 */
export async function resetVersion(version: OwnedVersion, userId: string): Promise<ResumeVersion> {
  const claimed = await prisma.resumeVersion.updateMany({
    where: { id: version.id, isProcessing: false },
    data: { isProcessing: true },
  });
  if (claimed.count === 0) {
    throw new ConflictError("This version is already being updated");
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.resumeVersion.update({
        where: { id: version.id },
        data: {
          previousContentJson: version.contentJson as object,
          previousStyleJson: version.styleJson as object,
          previousRevision: version.revision,
          contentJson: version.baseContentJson as object,
          styleJson: version.baseStyleJson as object,
          revision: { increment: 1 },
          isProcessing: false,
        },
      });
      await tx.versionPrompt.updateMany({
        where: { versionId: version.id, isActive: true },
        data: { isActive: false },
      });
      await tx.generationRun.create({
        data: {
          userId,
          resumeId: version.resumeId,
          versionId: version.id,
          operation: "RESET",
          modelId: "n/a",
          status: "SUCCESS",
        },
      });
      return saved;
    });
    return updated;
  } catch (error) {
    await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
    throw error;
  }
}

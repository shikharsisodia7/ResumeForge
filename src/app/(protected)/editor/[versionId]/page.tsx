import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { EditorClient } from "@/components/editor/editor-client";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";

export default async function EditorPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const user = await requireUser();

  const version = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resume: { userId: user.id } },
    include: { resume: { select: { title: true } } },
  });
  if (!version) notFound();

  const [versionPrompts, savedPrompts] = await Promise.all([
    prisma.versionPrompt.findMany({
      where: { versionId: version.id },
      orderBy: { order: "asc" },
      include: { prompt: { select: { id: true, text: true, description: true, isShared: true } } },
    }),
    prisma.customPrompt.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <EditorClient
      initialVersion={{
        id: version.id,
        resumeId: version.resumeId,
        resumeTitle: version.resume.title,
        name: version.name,
        targetCompany: version.targetCompany,
        targetRole: version.targetRole,
        jobDescription: version.jobDescription,
        parentVersionId: version.parentVersionId,
        contentJson: resumeContentSchema.parse(version.contentJson),
        styleJson: resumeStyleSchema.parse(version.styleJson),
        revision: version.revision,
        canUndo: version.previousRevision !== null,
        isProcessing: version.isProcessing,
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
      }}
      initialActivePrompts={versionPrompts.map((vp) => ({
        id: vp.id,
        versionId: vp.versionId,
        promptId: vp.promptId,
        order: vp.order,
        isActive: vp.isActive,
        createdAt: vp.createdAt.toISOString(),
        updatedAt: vp.updatedAt.toISOString(),
        prompt: vp.prompt,
      }))}
      initialSavedPrompts={savedPrompts.map((p) => ({
        id: p.id,
        creatorId: p.creatorId,
        text: p.text,
        description: p.description,
        isShared: p.isShared,
        copiedFromId: p.copiedFromId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}

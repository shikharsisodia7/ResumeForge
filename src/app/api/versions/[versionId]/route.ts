import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { updateVersionSchema } from "@/lib/schemas/requests";

export const GET = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const versionPrompts = await prisma.versionPrompt.findMany({
    where: { versionId: version.id },
    orderBy: { order: "asc" },
    include: { prompt: { select: { id: true, text: true, description: true, isShared: true } } },
  });

  return NextResponse.json({
    version: {
      id: version.id,
      resumeId: version.resumeId,
      resumeTitle: version.resume.title,
      name: version.name,
      targetCompany: version.targetCompany,
      targetRole: version.targetRole,
      jobDescription: version.jobDescription,
      parentVersionId: version.parentVersionId,
      contentJson: version.contentJson,
      styleJson: version.styleJson,
      revision: version.revision,
      canUndo: version.previousRevision !== null,
      isProcessing: version.isProcessing,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    },
    activePrompts: versionPrompts,
  });
});

export const PATCH = apiRoute(async (request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const body = updateVersionSchema.parse(await request.json());

  const updated = await prisma.resumeVersion.update({
    where: { id: version.id },
    data: {
      name: body.name,
      targetCompany: body.targetCompany,
      targetRole: body.targetRole,
      jobDescription: body.jobDescription,
    },
  });

  return NextResponse.json({ version: updated });
});

export const DELETE = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  await prisma.resumeVersion.delete({ where: { id: version.id } });

  return NextResponse.json({ deleted: true });
});

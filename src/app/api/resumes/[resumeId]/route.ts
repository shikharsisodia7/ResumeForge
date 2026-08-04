import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedResume } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { deleteStorageObject } from "@/lib/storage/blob";

export const GET = apiRoute(async (_request, ctx) => {
  const { resumeId } = await ctx.params;
  const user = await requireUser();
  const resume = await requireOwnedResume(resumeId, user.id);

  const versions = await prisma.resumeVersion.findMany({
    where: { resumeId: resume.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      targetCompany: true,
      targetRole: true,
      parentVersionId: true,
      revision: true,
      isProcessing: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    resume: {
      id: resume.id,
      title: resume.title,
      originalFilename: resume.originalFilename,
      isProcessing: resume.isProcessing,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    },
    versions,
  });
});

export const DELETE = apiRoute(async (_request, ctx) => {
  const { resumeId } = await ctx.params;
  const user = await requireUser();
  const resume = await requireOwnedResume(resumeId, user.id);

  await prisma.resume.delete({ where: { id: resume.id } });
  if (resume.storageKey) {
    await deleteStorageObject(resume.storageKey).catch(() => {});
  }

  return NextResponse.json({ deleted: true });
});

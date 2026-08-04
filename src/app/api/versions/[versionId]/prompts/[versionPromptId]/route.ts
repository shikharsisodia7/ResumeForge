import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { toggleVersionPromptSchema } from "@/lib/schemas/requests";

export const PATCH = apiRoute(async (request, ctx) => {
  const { versionId, versionPromptId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const existing = await prisma.versionPrompt.findFirst({
    where: { id: versionPromptId, versionId: version.id },
  });
  if (!existing) throw new NotFoundError("Prompt assignment not found");

  const { isActive } = toggleVersionPromptSchema.parse(await request.json());

  const updated = await prisma.versionPrompt.update({
    where: { id: existing.id },
    data: { isActive },
    include: { prompt: { select: { id: true, text: true, description: true, isShared: true } } },
  });

  return NextResponse.json({ versionPrompt: updated });
});

export const DELETE = apiRoute(async (_request, ctx) => {
  const { versionId, versionPromptId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const existing = await prisma.versionPrompt.findFirst({
    where: { id: versionPromptId, versionId: version.id },
  });
  if (!existing) throw new NotFoundError("Prompt assignment not found");

  await prisma.versionPrompt.delete({ where: { id: existing.id } });

  return NextResponse.json({ deleted: true });
});

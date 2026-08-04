import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { reorderVersionPromptsSchema } from "@/lib/schemas/requests";

export const GET = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const versionPrompts = await prisma.versionPrompt.findMany({
    where: { versionId: version.id },
    orderBy: { order: "asc" },
    include: { prompt: { select: { id: true, text: true, description: true, isShared: true } } },
  });

  return NextResponse.json({ versionPrompts });
});

/** Bulk reorder: body.order is the full list of this version's versionPrompt ids, in the new order. */
export const PATCH = apiRoute(async (request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const { order } = reorderVersionPromptsSchema.parse(await request.json());

  const existing = await prisma.versionPrompt.findMany({
    where: { versionId: version.id },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((vp) => vp.id));
  if (order.length !== existingIds.size || !order.every((id) => existingIds.has(id))) {
    throw new ValidationError("order must contain exactly this version's prompt assignments");
  }

  await prisma.$transaction(order.map((id, index) => prisma.versionPrompt.update({ where: { id }, data: { order: index } })));

  const versionPrompts = await prisma.versionPrompt.findMany({
    where: { versionId: version.id },
    orderBy: { order: "asc" },
    include: { prompt: { select: { id: true, text: true, description: true, isShared: true } } },
  });

  return NextResponse.json({ versionPrompts });
});

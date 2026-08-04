import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";

export const POST = apiRoute(async (_request, ctx) => {
  const { promptId } = await ctx.params;
  const user = await requireUser();

  const source = await prisma.customPrompt.findFirst({
    where: { id: promptId, isShared: true },
  });
  if (!source) throw new NotFoundError("Shared prompt not found");
  if (source.creatorId === user.id) {
    throw new ConflictError("This prompt is already in your library");
  }

  const existingCopy = await prisma.customPrompt.findUnique({
    where: { creatorId_copiedFromId: { creatorId: user.id, copiedFromId: source.id } },
  });
  if (existingCopy) {
    return NextResponse.json({ prompt: existingCopy, alreadyCopied: true });
  }

  const copy = await prisma.customPrompt.create({
    data: {
      creatorId: user.id,
      text: source.text,
      description: source.description,
      isShared: false,
      copiedFromId: source.id,
    },
  });

  return NextResponse.json({ prompt: copy, alreadyCopied: false }, { status: 201 });
});

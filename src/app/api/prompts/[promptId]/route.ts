import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedPrompt } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { updatePromptSchema } from "@/lib/schemas/requests";

export const PATCH = apiRoute(async (request, ctx) => {
  const { promptId } = await ctx.params;
  const user = await requireUser();
  const prompt = await requireOwnedPrompt(promptId, user.id);

  const body = updatePromptSchema.parse(await request.json());

  const updated = await prisma.customPrompt.update({
    where: { id: prompt.id },
    data: {
      text: body.text,
      description: body.description,
      isShared: body.isShared,
    },
  });

  return NextResponse.json({ prompt: updated });
});

export const DELETE = apiRoute(async (_request, ctx) => {
  const { promptId } = await ctx.params;
  const user = await requireUser();
  const prompt = await requireOwnedPrompt(promptId, user.id);

  await prisma.customPrompt.delete({ where: { id: prompt.id } });

  return NextResponse.json({ deleted: true });
});

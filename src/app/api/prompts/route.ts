import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { apiRoute } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createPromptSchema } from "@/lib/schemas/requests";

export const GET = apiRoute(async () => {
  const user = await requireUser();

  const prompts = await prisma.customPrompt.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ prompts });
});

export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  const body = createPromptSchema.parse(await request.json());

  const prompt = await prisma.customPrompt.create({
    data: {
      creatorId: user.id,
      text: body.text,
      description: body.description,
      isShared: body.isShared,
    },
  });

  return NextResponse.json({ prompt }, { status: 201 });
});

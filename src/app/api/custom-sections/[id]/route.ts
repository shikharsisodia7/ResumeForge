import { prisma } from "@/lib/db";
import { getPrimaryProfile } from "@/lib/get-profile";
import { bad, ok } from "@/lib/api-json";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await getPrimaryProfile();
  const existing = await prisma.customSection.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return bad("Not found", 404);
  const body = (await req.json()) as { title?: string; content?: string | null };
  const updated = await prisma.customSection.update({
    where: { id },
    data: {
      ...("title" in body && body.title !== undefined ? { title: body.title } : {}),
      ...("content" in body ? { content: body.content ?? null } : {}),
    },
  });
  return ok(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await getPrimaryProfile();
  const existing = await prisma.customSection.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return bad("Not found", 404);
  await prisma.customSection.delete({ where: { id } });
  return ok({ ok: true });
}

import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/api-json";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.fileAsset.delete({ where: { id } });
  return ok({ ok: true });
}

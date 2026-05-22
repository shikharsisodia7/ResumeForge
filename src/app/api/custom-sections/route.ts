import { prisma } from "@/lib/db";
import { getPrimaryProfile } from "@/lib/get-profile";
import { bad, ok } from "@/lib/api-json";

export async function POST(req: Request) {
  const profile = await getPrimaryProfile();
  const body = (await req.json()) as { title: string; content?: string };
  if (!body.title?.trim()) return bad("Title required");
  const maxOrder = await prisma.customSection.findFirst({
    where: { profileId: profile.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.customSection.create({
    data: {
      profileId: profile.id,
      title: body.title.trim(),
      content: body.content ?? null,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });
  return ok(row);
}

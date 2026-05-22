import { prisma } from "@/lib/db";
import { getPrimaryProfile } from "@/lib/get-profile";
import { bad, ok } from "@/lib/api-json";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await getPrimaryProfile();
  const existing = await prisma.education.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return bad("Not found", 404);
  const body = (await req.json()) as Record<string, unknown>;
  const updated = await prisma.education.update({
    where: { id },
    data: {
      ...("school" in body ? { school: String(body.school) } : {}),
      ...("degree" in body ? { degree: body.degree === null ? null : String(body.degree) } : {}),
      ...("major" in body ? { major: body.major === null ? null : String(body.major) } : {}),
      ...("gpa" in body ? { gpa: body.gpa === null ? null : String(body.gpa) } : {}),
      ...("graduationDate" in body ? { graduationDate: body.graduationDate === null ? null : String(body.graduationDate) } : {}),
      ...("honors" in body ? { honors: body.honors === null ? null : String(body.honors) } : {}),
      ...("notes" in body ? { notes: body.notes === null ? null : String(body.notes) } : {}),
    },
  });
  return ok(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const profile = await getPrimaryProfile();
  const existing = await prisma.education.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return bad("Not found", 404);
  await prisma.education.delete({ where: { id } });
  return ok({ ok: true });
}

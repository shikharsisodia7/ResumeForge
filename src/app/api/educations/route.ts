import { prisma } from "@/lib/db";
import { getPrimaryProfile } from "@/lib/get-profile";
import { bad, ok } from "@/lib/api-json";

export async function POST(req: Request) {
  const profile = await getPrimaryProfile();
  const body = (await req.json()) as {
    school: string;
    degree?: string;
    major?: string;
    graduationDate?: string;
  };
  if (!body.school?.trim()) return bad("School required");
  const maxOrder = await prisma.education.findFirst({
    where: { profileId: profile.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const row = await prisma.education.create({
    data: {
      profileId: profile.id,
      school: body.school.trim(),
      degree: body.degree,
      major: body.major,
      graduationDate: body.graduationDate,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });
  return ok(row);
}

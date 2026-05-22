import { getPrimaryProfile } from "@/lib/get-profile";
import { prisma } from "@/lib/db";
import { parseResumeText, extractBulletsFromSection } from "@/lib/engines/resume-import";
import { bad, ok } from "@/lib/api-json";
import { scoreBullet } from "@/lib/engines/bullet-scoring";

export async function POST(req: Request) {
  const profile = await getPrimaryProfile();
  const body = (await req.json()) as { rawText: string; createBullets?: boolean };
  if (!body.rawText?.trim()) return bad("rawText required");

  const sections = parseResumeText(body.rawText);
  const bullets: string[] = [];
  sections.forEach((s) => bullets.push(...extractBulletsFromSection(s.content)));

  let createdBullets = 0;
  if (body.createBullets && bullets.length) {
    for (let i = 0; i < Math.min(bullets.length, 80); i++) {
      const text = bullets[i]!.slice(0, 2000);
      const scored = scoreBullet(text);
      await prisma.bullet.create({
        data: {
          profileId: profile.id,
          text,
          category: "technical",
          status: "needs-work",
          strengthScore: scored.totalScore,
          clarityScore: scored.clearOutcome,
          specificityScore: scored.specificTask,
          impactScore: scored.measurableImpact,
          keywordScore: scored.toolSkill,
          atsScore: scored.goodLength,
          totalScore: scored.totalScore,
        },
      });
      createdBullets++;
    }
  }

  await prisma.timelineEvent.create({
    data: {
      type: "import",
      title: "Resume text imported",
      entityType: "UserProfile",
      entityId: profile.id,
      metadata: JSON.stringify({ sections: sections.length, extractedBullets: bullets.length }),
    },
  });

  return ok({
    sections,
    extractedBulletCount: bullets.length,
    bulletsPreview: bullets.slice(0, 24),
    createdBullets,
  });
}

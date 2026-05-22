import { prisma } from "@/lib/db";
import { simulateATS } from "@/lib/engines/ats-simulator";
import { parseJson } from "@/lib/utils";
import type { JobTextAnalysis } from "@/lib/types";
import { buildResumeContentFromVersion } from "@/lib/services/resume-content";
import { bad, ok } from "@/lib/api-json";

export async function POST(req: Request) {
  const body = (await req.json()) as { resumeVersionId: string; jobDescriptionId?: string | null };

  const content = await buildResumeContentFromVersion(body.resumeVersionId);
  if (!content) return bad("Version not found", 404);

  let jobKw: string[] = [];
  if (body.jobDescriptionId) {
    const jd = await prisma.jobDescription.findUnique({ where: { id: body.jobDescriptionId } });
    if (jd?.extractedKeywords) {
      const parsed = parseJson<JobTextAnalysis | null>(jd.extractedKeywords, null);
      jobKw = parsed?.rankedKeywords?.map((k) => k.term) ?? [];
    }
  }

  const ats = simulateATS(
    {
      profile: content.profile,
      bullets: content.bulletTexts,
      skills: content.skillNames,
      sections: content.sections.map((s) => s.title),
      plainText: content.plainText,
    },
    jobKw.length ? jobKw : undefined
  );

  const row = await prisma.scoreReport.create({
    data: {
      resumeVersionId: body.resumeVersionId,
      type: "ats",
      totalScore: ats.totalScore,
      breakdown: JSON.stringify(ats),
      warnings: JSON.stringify(ats.warnings),
      recommendations: JSON.stringify(ats.fixes),
    },
  });

  await prisma.resumeVersion.update({
    where: { id: body.resumeVersionId },
    data: { atsScore: ats.totalScore },
  });

  await prisma.timelineEvent.create({
    data: {
      type: "ats",
      title: `ATS scan: ${ats.totalScore}/100`,
      entityType: "ResumeVersion",
      entityId: body.resumeVersionId,
    },
  });

  return ok({ id: row.id, ats });
}

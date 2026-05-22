import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { simulateATS } from "@/lib/engines/ats-simulator";
import { buildResumeContentFromVersion } from "@/lib/services/resume-content";
import { jobKeywordTerms } from "@/lib/services/matcher-input";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resumeVersionId?: string;
      jobDescriptionId?: string | null;
    };

    const { resumeVersionId, jobDescriptionId } = body;
    if (!resumeVersionId) return jsonErr("resumeVersionId is required", 400);

    const content = await buildResumeContentFromVersion(resumeVersionId);
    const bundle = await prisma.resumeVersion.findUnique({
      where: { id: resumeVersionId },
      include: { resume: true },
    });
    if (!content || !bundle?.resume) return jsonErr("Resume version not found", 404);

    const jdTerms = await jobKeywordTerms(jobDescriptionId ?? bundle.jobDescriptionId ?? undefined);

    const report = simulateATS(
      {
        profile: {
          fullName: content.profile.fullName,
          email: content.profile.email,
          phone: content.profile.phone,
          linkedIn: content.profile.linkedIn,
          github: content.profile.github,
        },
        bullets: content.bulletTexts,
        skills: content.skillNames,
        sections: content.sections.map((s) => s.title),
        plainText: content.plainText,
        onePageMode: bundle.resume.onePageMode,
      },
      jdTerms
    );

    try {
      await prisma.resumeVersion.update({
        where: { id: resumeVersionId },
        data: { atsScore: report.totalScore },
      });
      await prisma.scoreReport.create({
        data: {
          resumeVersionId,
          type: "ats",
          totalScore: report.totalScore,
          breakdown: JSON.stringify(report),
          warnings: report.warnings.map((w) => w.message).join("\n"),
          recommendations: report.fixes.map((f) => f.message).join("\n"),
        },
      });
    } catch {
      /* optional persistence */
    }

    return NextResponse.json({ report });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to simulate ATS", 500);
  }
}

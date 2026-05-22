import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { matchResumeToJob } from "@/lib/engines/job-matcher";
import { buildMatcherInputFromDb } from "@/lib/services/matcher-input";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobDescriptionId?: string;
      resumeVersionId?: string;
    };

    const { jobDescriptionId, resumeVersionId } = body;
    if (!jobDescriptionId) return jsonErr("jobDescriptionId is required", 400);
    if (!resumeVersionId) return jsonErr("resumeVersionId is required", 400);

    const loaded = await buildMatcherInputFromDb(jobDescriptionId, resumeVersionId);
    if (!loaded) return jsonErr("Job or resume version not found", 404);

    const match = matchResumeToJob(loaded.input);

    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: {
        jobMatchScore: match.overallScore,
        keywordScore: match.keywordScore,
        jobDescriptionId,
      },
    });

    let report = null as Awaited<ReturnType<typeof prisma.matchReport.create>> | null;
    try {
      report = await prisma.matchReport.create({
        data: {
          jobDescriptionId,
          resumeVersionId,
          overallScore: match.overallScore,
          hardSkillScore: match.hardSkillScore,
          softSkillScore: match.softSkillScore,
          keywordScore: match.keywordScore,
          experienceScore: match.experienceScore,
          projectScore: match.projectScore,
          educationScore: match.educationScore,
          responsibilityScore: match.responsibilityScore,
          atsFormatScore: match.atsFormatScore,
          reportData: JSON.stringify(match),
        },
      });
    } catch {
      /* optional persistence failure */
    }

    return NextResponse.json({
      match,
      matchReport: report ?? undefined,
    });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to compute match", 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { tailorResume } from "@/lib/engines/tailoring-engine";
import { matchResumeToJob } from "@/lib/engines/job-matcher";
import { buildMatcherInputFromDb } from "@/lib/services/matcher-input";
import { addTimelineEvent } from "@/lib/services/timeline";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobDescriptionId?: string;
      resumeVersionId?: string;
      selectedBulletIds?: string[];
      onePageMode?: boolean;
    };

    const { jobDescriptionId, resumeVersionId, selectedBulletIds, onePageMode } = body;
    if (!jobDescriptionId) return jsonErr("jobDescriptionId is required", 400);
    if (!resumeVersionId) return jsonErr("resumeVersionId is required", 400);

    const loaded = await buildMatcherInputFromDb(jobDescriptionId, resumeVersionId);
    if (!loaded) return jsonErr("Job or resume version not found", 404);

    const before = matchResumeToJob(loaded.input);
    const result = tailorResume({
      ...loaded.input,
      selectedBulletIds,
      onePageMode,
      scoreBefore: before.overallScore,
    });

    const baseVersion = await prisma.resumeVersion.findUnique({
      where: { id: resumeVersionId },
      include: {
        resume: {
          select: { onePageMode: true, targetRole: true, targetCompany: true, targetIndustry: true },
        },
      },
    });
    if (!baseVersion?.resumeId) return jsonErr("Resume version not linked to resume", 500);

    const nextName = `${baseVersion.versionName} (tailored)`;

    const newVersion = await prisma.resumeVersion.create({
      data: {
        resumeId: baseVersion.resumeId,
        versionName: nextName.slice(0, 120),
        parentVersionId: resumeVersionId,
        jobDescriptionId,
        selectedBullets: JSON.stringify(result.selectedBullets),
        selectedProjects:
          result.selectedProjects.length > 0
            ? JSON.stringify(result.selectedProjects)
            : baseVersion.selectedProjects ?? undefined,
        selectedExperiences:
          result.selectedExperiences.length > 0
            ? JSON.stringify(result.selectedExperiences)
            : baseVersion.selectedExperiences ?? undefined,
        selectedSkills:
          result.selectedSkills.length > 0 ? JSON.stringify(result.selectedSkills) : baseVersion.selectedSkills ?? undefined,
        changesSummary: JSON.stringify(result.changesSummary),
        jobMatchScore: result.report.overallScore,
        keywordScore: result.report.keywordScore,
        bulletScore:
          Math.round(
            ((result.report.keywordScore ?? 0) +
              (result.report.hardSkillScore ?? 0) +
              (result.report.softSkillScore ?? 0)) /
              3
          ),
        tailoringConfidence: result.report.tailoringConfidence,
        atsScore: result.report.atsFormatScore,
        targetCompany: baseVersion.resume.targetCompany ?? undefined,
        targetRole: baseVersion.resume.targetRole ?? undefined,
        targetIndustry: baseVersion.resume.targetIndustry ?? undefined,
      },
    });

    await prisma.matchReport.create({
      data: {
        jobDescriptionId,
        resumeVersionId: newVersion.id,
        overallScore: result.report.overallScore,
        hardSkillScore: result.report.hardSkillScore,
        softSkillScore: result.report.softSkillScore,
        keywordScore: result.report.keywordScore,
        experienceScore: result.report.experienceScore,
        projectScore: result.report.projectScore,
        educationScore: result.report.educationScore,
        responsibilityScore: result.report.responsibilityScore,
        atsFormatScore: result.report.atsFormatScore,
        reportData: JSON.stringify(result.report),
      },
    });

    await addTimelineEvent(
      "tailor",
      "Resume tailored for job",
      `New version: ${newVersion.versionName}`,
      "ResumeVersion",
      newVersion.id,
      { jobDescriptionId, parentVersionId: resumeVersionId, onePageMode: onePageMode ?? true }
    );

    return NextResponse.json({
      resumeVersion: newVersion,
      tailoring: result,
    });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to tailor resume", 500);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/api-json";
import { buildResumeContentFromVersion } from "@/lib/services/resume-content";

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("versionId");
  if (!v) return bad("versionId required");
  const version = await prisma.resumeVersion.findUnique({
    where: { id: v },
    include: { resume: true },
  });
  if (!version) return bad("Version not found", 404);

  const profileId = version.resume.profileId;

  const [bulletTotal, skillTotal, projectTotal, experienceTotal, jd] = await Promise.all([
    prisma.bullet.count({ where: { profileId } }),
    prisma.skill.count({ where: { profileId } }),
    prisma.project.count({ where: { profileId } }),
    prisma.experience.count({ where: { profileId } }),
    prisma.jobDescription.findMany({ select: { id: true, title: true, company: true }, orderBy: { updatedAt: "desc" }, take: 40 }),
  ]);

  const lastScoreReport = await prisma.scoreReport.findFirst({
    where: { resumeVersionId: v },
    orderBy: { createdAt: "desc" },
  });

  const content = await buildResumeContentFromVersion(v);

  return ok({
    version,
    resume: version.resume,
    content,
    jdOptions: jd,
    totals: {
      bullets: bulletTotal,
      skills: skillTotal,
      projects: projectTotal,
      experiences: experienceTotal,
    },
    lastScoreReport,
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    versionId: string;
    template?: string;
    font?: string;
    spacing?: string;
    margins?: string;
    onePageMode?: boolean;
    sectionOrder?: unknown;
    hiddenSections?: unknown;
    selectedBullets?: string[] | null;
    selectedSkills?: string[] | null;
    selectedProjects?: string[] | null;
    selectedExperiences?: string[] | null;
    selectedEducation?: string[] | null;
  };
  if (!body.versionId) return bad("versionId required");

  const current = await prisma.resumeVersion.findUnique({ where: { id: body.versionId }, include: { resume: true } });
  if (!current) return bad("Version not found", 404);

  const resumeData: Parameters<typeof prisma.resume.update>[0]["data"] = {};
  if (body.template !== undefined) resumeData.template = body.template;
  if (body.font !== undefined) resumeData.font = body.font;
  if (body.spacing !== undefined) resumeData.spacing = body.spacing;
  if (body.margins !== undefined) resumeData.margins = body.margins;
  if (typeof body.onePageMode === "boolean") resumeData.onePageMode = body.onePageMode;
  if (body.sectionOrder !== undefined) resumeData.sectionOrder = JSON.stringify(body.sectionOrder);
  if (body.hiddenSections !== undefined) resumeData.hiddenSections = JSON.stringify(body.hiddenSections);

  if (Object.keys(resumeData).length) {
    await prisma.resume.update({ where: { id: current.resumeId }, data: resumeData });
  }

  const versionData: Parameters<typeof prisma.resumeVersion.update>[0]["data"] = {};
  if (body.selectedBullets !== undefined) versionData.selectedBullets = stringifyOrNull(body.selectedBullets);
  if (body.selectedSkills !== undefined) versionData.selectedSkills = stringifyOrNull(body.selectedSkills);
  if (body.selectedProjects !== undefined) versionData.selectedProjects = stringifyOrNull(body.selectedProjects);
  if (body.selectedExperiences !== undefined) versionData.selectedExperiences = stringifyOrNull(body.selectedExperiences);
  if (body.selectedEducation !== undefined) versionData.selectedEducation = stringifyOrNull(body.selectedEducation);

  const updatedVersion =
    Object.keys(versionData).length > 0
      ? await prisma.resumeVersion.update({ where: { id: body.versionId }, data: versionData })
      : await prisma.resumeVersion.findUnique({ where: { id: body.versionId } });

  const resume = await prisma.resume.findUnique({ where: { id: current.resumeId } });

  return ok({ version: updatedVersion, resume });
}

function stringifyOrNull(arr: string[] | null): string | null {
  if (arr === null) return null;
  return JSON.stringify(arr);
}

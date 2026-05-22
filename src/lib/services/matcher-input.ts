import type { MatcherInput } from "@/lib/engines/job-matcher";
import type { JobTextAnalysis } from "@/lib/types";
import type { ResumeContent } from "@/lib/types";
import { analyzeJobDescription } from "@/lib/engines/text-analysis";
import { prisma } from "@/lib/db";
import { gatherResumeVersionBundle } from "@/lib/services/resume-content";

function resolvedJobAnalysis(
  jd: {
    descriptionText: string;
    title: string;
    category: string;
    extractedKeywords?: string | null;
  },
  customDict?: Record<string, string[]>
): JobTextAnalysis {
  if (jd.extractedKeywords?.trim()) {
    try {
      const parsed = JSON.parse(jd.extractedKeywords) as JobTextAnalysis;
      if (parsed?.rankedKeywords?.length || parsed?.keywords?.length) {
        return parsed;
      }
    } catch {
      /* fallback below */
    }
  }
  return analyzeJobDescription(jd.descriptionText, jd.title, jd.category, customDict);
}

/** Optional job-derived keyword list for ATS / bullet tuning. */
export async function jobKeywordTerms(jobDescriptionId: string | undefined): Promise<string[] | undefined> {
  if (!jobDescriptionId) return undefined;
  const jd = await prisma.jobDescription.findUnique({
    where: { id: jobDescriptionId },
    select: {
      extractedKeywords: true,
      descriptionText: true,
      title: true,
      category: true,
      keywords: true,
    },
  });
  if (!jd) return undefined;
  if (jd.keywords.length > 0) return jd.keywords.map((k) => k.term);
  const analysis = resolvedJobAnalysis(jd);
  return analysis.rankedKeywords.slice(0, 40).map((k) => k.term);
}

export async function buildMatcherInputFromDb(
  jobDescriptionId: string,
  resumeVersionId: string,
  customDict?: Record<string, string[]>
): Promise<{ input: MatcherInput; jobKwForBullets: string[] } | null> {
  const jd = await prisma.jobDescription.findUnique({
    where: { id: jobDescriptionId },
    select: {
      descriptionText: true,
      title: true,
      category: true,
      extractedKeywords: true,
      keywords: true,
    },
  });

  const bundle = await gatherResumeVersionBundle(resumeVersionId);
  if (!jd || !bundle) return null;

  const jobAnalysis = resolvedJobAnalysis(jd, customDict);
  const jobKwForBullets =
    jd.keywords.length > 0
      ? jd.keywords.map((k) => k.term)
      : jobAnalysis.rankedKeywords.slice(0, 40).map((k) => k.term);

  const { profile, bullets, skills, projects, experiences, educations } = bundle;

  const sections: ResumeContent["sections"] = [];

  if (profile.summary) {
    sections.push({
      type: "summary",
      title: "Summary",
      items: [{ id: "summary", content: profile.summary }],
    });
  }
  if (skills.length) {
    sections.push({
      type: "skills",
      title: "Skills",
      items: [{ id: "skills", content: skills.map((s) => s.name).join(" • ") }],
    });
  }
  if (experiences.length) {
    sections.push({
      type: "experience",
      title: "Experience",
      items: experiences.flatMap((e) => {
        const expBullets = bullets.filter((b) => b.experienceId === e.id);
        const header = `${e.title} | ${e.organization}${e.startDate ? ` | ${e.startDate}${e.endDate ? ` – ${e.endDate}` : ""}` : ""}`;
        if (expBullets.length) {
          return expBullets.map((b, i) => ({
            id: b.id,
            content: i === 0 ? header : "",
            subContent: `• ${b.text}`,
          }));
        }
        return [{ id: e.id, content: header, subContent: e.description ?? undefined }];
      }),
    });
  }
  if (projects.length) {
    sections.push({
      type: "projects",
      title: "Projects",
      items: projects.map((p) => ({
        id: p.id,
        content: p.name,
        subContent: [
          p.shortDescription,
          p.techStack ? `Tech: ${p.techStack}` : null,
          ...bullets.filter((b) => b.projectId === p.id).map((b) => `• ${b.text}`),
        ]
          .filter(Boolean)
          .join("\n"),
      })),
    });
  }
  if (educations.length) {
    sections.push({
      type: "education",
      title: "Education",
      items: educations.map((e) => ({
        id: e.id,
        content: `${e.school}${e.degree ? ` — ${e.degree}` : ""}${e.major ? `, ${e.major}` : ""}`,
        subContent: [e.gpa ? `GPA: ${e.gpa}` : null, e.graduationDate].filter(Boolean).join(" | ") || undefined,
      })),
    });
  }

  const plainText = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.summary,
    ...skills.map((s) => s.name),
    ...bullets.map((b) => b.text),
    ...projects.map((p) => `${p.name} ${p.shortDescription ?? ""}`),
    ...experiences.map((e) => `${e.title} ${e.organization}`),
  ]
    .filter(Boolean)
    .join("\n");

  const resumeBase: ResumeContent = {
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedIn: profile.linkedIn,
      github: profile.github,
      portfolio: profile.portfolio,
      website: profile.website,
      summary: profile.summary,
    },
    sections,
    plainText,
    bulletTexts: bullets.map((b) => b.text),
    skillNames: skills.map((s) => s.name),
  };

  const input: MatcherInput = {
    jobText: jd.descriptionText,
    jobTitle: jd.title,
    jobCategory: jd.category,
    jobAnalysis,
    resume: {
      ...resumeBase,
      bullets: bullets.map((b) => ({
        id: b.id,
        text: b.text,
        experienceId: b.experienceId,
        projectId: b.projectId,
      })),
      skills: skills.map((s) => ({ id: s.id, name: s.name, evidenceStrength: s.evidenceStrength })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        shortDescription: p.shortDescription,
        techStack: p.techStack,
        skillsProven: p.skillsProven,
      })),
      experiences: experiences.map((e) => ({
        id: e.id,
        title: e.title,
        organization: e.organization,
        description: e.description,
      })),
      educations: educations.map((e) => ({
        id: e.id,
        school: e.school,
        degree: e.degree,
        major: e.major,
        coursework: e.coursework,
      })),
    },
  };

  return { input, jobKwForBullets };
}

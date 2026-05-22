import { matchResumeToJob, type MatcherInput } from "./job-matcher";
import type { TailoringRecommendation, TailoringResult } from "@/lib/types";

const MAX_BULLETS_ONE_PAGE = 12;
const MAX_BULLETS_TWO_PAGE = 18;

export function tailorResume(input: MatcherInput & {
  selectedBulletIds?: string[];
  onePageMode?: boolean;
  scoreBefore?: number;
}): TailoringResult {
  const report = matchResumeToJob(input);
  const recommendations: TailoringRecommendation[] = [];
  const jobKw = report.missingKeywords.concat(report.strongKeywords).map((k) => k.toLowerCase());

  const bulletRelevance = input.resume.bullets.map((b) => ({
    id: b.id,
    text: b.text,
    relevance: jobKw.filter((k) => b.text.toLowerCase().includes(k)).length,
    score: report.recommendedBulletsAdd.find((r) => r.id === b.id)?.score ?? 0,
  }));

  bulletRelevance.sort((a, b) => b.relevance * 100 + b.score - (a.relevance * 100 + a.score));

  const maxBullets = input.onePageMode !== false ? MAX_BULLETS_ONE_PAGE : MAX_BULLETS_TWO_PAGE;
  const selectedBullets = input.selectedBulletIds?.length
    ? input.selectedBulletIds
    : bulletRelevance.slice(0, maxBullets).map((b) => b.id);

  const removedBullets = input.resume.bullets
    .filter((b) => !selectedBullets.includes(b.id))
    .map((b) => b.id);

  report.recommendedBulletsAdd.forEach((b) => {
    if (!selectedBullets.includes(b.id)) {
      recommendations.push({
        type: "add-bullet",
        id: b.id,
        label: b.text.slice(0, 60) + "...",
        reason: `High relevance score (${b.score}) for this job`,
        priority: "high",
      });
    }
  });

  report.recommendedBulletsRemove.forEach((b) => {
    recommendations.push({
      type: "remove-bullet",
      id: b.id,
      label: b.text.slice(0, 60) + "...",
      reason: b.reason,
      priority: "medium",
    });
  });

  report.recommendedProjects.forEach((p) => {
    recommendations.push({
      type: "add-project",
      id: p.id,
      label: p.name,
      reason: "Project tech stack aligns with job tools",
      priority: "high",
    });
  });

  report.recommendedExperiences.forEach((e) => {
    recommendations.push({
      type: "add-experience",
      id: e.id,
      label: e.title,
      reason: "Experience aligns with target role category",
      priority: "high",
    });
  });

  report.recommendedSkillsMove.forEach((skill) => {
    recommendations.push({
      type: "move-skill",
      label: skill,
      reason: "Skill matches job requirements — move higher on resume",
      priority: "medium",
    });
  });

  report.skillsInJobNotResume.forEach((skill) => {
    recommendations.push({
      type: "warning",
      label: skill,
      reason: "Job requires this but no evidence in profile — add real experience, do not invent",
      priority: "high",
    });
  });

  report.sectionWarnings.forEach((w) => {
    recommendations.push({ type: "warning", label: "Section", reason: w, priority: "medium" });
  });

  const selectedProjects = report.recommendedProjects.map((p) => p.id);
  const selectedExperiences = report.recommendedExperiences.map((e) => e.id);
  const selectedSkills = input.resume.skills
    .filter((s) => report.recommendedSkillsMove.includes(s.name))
    .map((s) => s.id);

  const tailoredInput: MatcherInput = {
    ...input,
    resume: {
      ...input.resume,
      bullets: input.resume.bullets.filter((b) => selectedBullets.includes(b.id)),
      projects: input.resume.projects.filter((p) => selectedProjects.includes(p.id) || selectedProjects.length === 0),
      skills: input.resume.skills.filter((s) => selectedSkills.includes(s.id) || selectedSkills.length === 0),
    },
  };

  const afterReport = matchResumeToJob(tailoredInput);
  const scoreBefore = input.scoreBefore ?? report.overallScore;
  const scoreAfter = afterReport.overallScore;

  const addedKw = report.missingKeywords.filter((k) =>
    selectedBullets.some((id) => {
      const b = input.resume.bullets.find((x) => x.id === id);
      return b?.text.toLowerCase().includes(k.toLowerCase());
    })
  );

  return {
    report: afterReport,
    recommendations,
    selectedBullets,
    selectedProjects,
    selectedExperiences,
    selectedSkills,
    changesSummary: {
      addedBullets: selectedBullets.filter((id) => !input.selectedBulletIds?.includes(id)),
      removedBullets: removedBullets,
      movedSkills: report.recommendedSkillsMove,
      addedProjects: selectedProjects,
      removedContent: removedBullets.map((id) => {
        const b = input.resume.bullets.find((x) => x.id === id);
        return b?.text.slice(0, 40) ?? id;
      }),
      scoreBefore,
      scoreAfter,
      warnings: report.skillsInJobNotResume.map(
        (s) => `"${s}" missing — add evidence to master profile before listing`
      ),
    },
  };
}

export function scoreProjectReadiness(project: {
  problemSolved?: string | null;
  techStack?: string | null;
  githubLink?: string | null;
  demoLink?: string | null;
  personalContribution?: string | null;
  metrics?: string | null;
  bullets?: { text: string }[];
  skillsProven?: string | null;
}): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;
  if (project.problemSolved) score += 15;
  else warnings.push("This project has no clear problem statement.");
  if (project.techStack) score += 15;
  else warnings.push("Add a tech stack to prove technical depth.");
  if (project.githubLink || project.demoLink) score += 15;
  else warnings.push("Add GitHub or demo link for proof.");
  if (project.personalContribution) score += 20;
  else warnings.push("Explain what you personally built.");
  if (project.metrics) score += 15;
  else warnings.push("This project has no measurable outcome.");
  const bulletCount = project.bullets?.length ?? 0;
  if (bulletCount > 0) score += 10;
  else warnings.push("This project has no bullet connected.");
  if (project.skillsProven && bulletCount > 0) {
    const skills = project.skillsProven.split(",").map((s) => s.trim().toLowerCase());
    const bulletText = (project.bullets ?? []).map((b) => b.text.toLowerCase()).join(" ");
    skills.forEach((skill) => {
      if (skill && !bulletText.includes(skill)) {
        warnings.push(`Project lists ${skill}, but no bullet proves ${skill}.`);
      }
    });
    score += 10;
  }
  return { score: Math.min(100, score), warnings };
}

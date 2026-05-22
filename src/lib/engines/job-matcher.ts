import { analyzeJobDescription, buildResumeText } from "./text-analysis";
import { simulateATS } from "./ats-simulator";
import { scoreBullet } from "./bullet-scoring";
import type {
  EvidenceItem,
  MatchReportData,
  MatchStatus,
  RequirementMatch,
  ResumeContent,
} from "@/lib/types";
import type { JobTextAnalysis } from "@/lib/types";

export interface MatcherInput {
  jobText: string;
  jobTitle: string;
  jobCategory: string;
  jobAnalysis?: JobTextAnalysis;
  resume: ResumeContent & {
    bullets: { id: string; text: string; experienceId?: string | null; projectId?: string | null }[];
    skills: { id: string; name: string; evidenceStrength?: number }[];
    projects: { id: string; name: string; shortDescription?: string | null; techStack?: string | null; skillsProven?: string | null }[];
    experiences: { id: string; title: string; organization: string; description?: string | null }[];
    educations: { id: string; school: string; degree?: string | null; major?: string | null }[];
  };
  customDict?: Record<string, string[]>;
}

function findEvidence(
  term: string,
  resume: MatcherInput["resume"]
): EvidenceItem[] {
  const lower = term.toLowerCase();
  const evidence: EvidenceItem[] = [];

  resume.bullets.forEach((b) => {
    if (b.text.toLowerCase().includes(lower)) {
      evidence.push({ type: "bullet", id: b.id, label: b.text.slice(0, 80) + "..." });
    }
  });
  resume.skills.forEach((s) => {
    if (s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())) {
      evidence.push({ type: "skill", id: s.id, label: s.name });
    }
  });
  resume.projects.forEach((p) => {
    const blob = `${p.name} ${p.shortDescription ?? ""} ${p.techStack ?? ""} ${p.skillsProven ?? ""}`.toLowerCase();
    if (blob.includes(lower)) {
      evidence.push({ type: "project", id: p.id, label: p.name });
    }
  });
  resume.experiences.forEach((e) => {
    const blob = `${e.title} ${e.organization} ${e.description ?? ""}`.toLowerCase();
    if (blob.includes(lower)) {
      evidence.push({ type: "experience", id: e.id, label: `${e.title} @ ${e.organization}` });
    }
  });
  resume.educations.forEach((e) => {
    const blob = `${e.school} ${e.degree ?? ""} ${e.major ?? ""}`.toLowerCase();
    if (blob.includes(lower)) {
      evidence.push({ type: "education", id: e.id, label: e.school });
    }
  });

  return evidence;
}

function statusFromEvidence(evidence: EvidenceItem[], skillOnly = false): MatchStatus {
  if (evidence.length === 0) return "missing";
  const types = new Set(evidence.map((e) => e.type));
  if (skillOnly && types.size === 1 && types.has("skill")) return "needs-evidence";
  if (evidence.length >= 2 || evidence.some((e) => e.type === "bullet" || e.type === "project")) {
    return "strong";
  }
  return "partial";
}

export function matchResumeToJob(input: MatcherInput): MatchReportData {
  const analysis =
    input.jobAnalysis ??
    analyzeJobDescription(input.jobText, input.jobTitle, input.jobCategory, input.customDict);

  const resumeText = buildResumeText({
    bullets: input.resume.bullets,
    skills: input.resume.skills,
    projects: input.resume.projects,
    experiences: input.resume.experiences,
    educations: input.resume.educations,
    summary: input.resume.profile.summary,
  });

  const topKeywords = analysis.rankedKeywords.slice(0, 40);
  const requirements: RequirementMatch[] = topKeywords.map((kw) => {
    const evidence = findEvidence(kw.term, input.resume);
    const status = statusFromEvidence(evidence);
    return {
      requirement: kw.term,
      category: kw.category,
      status,
      evidence,
      notes: kw.isRequired ? "Required keyword" : undefined,
    };
  });

  analysis.responsibilities.slice(0, 8).forEach((resp) => {
    const key = resp.slice(0, 60);
    const evidence = findEvidence(resp.split(" ")[0] ?? key, input.resume);
    if (!requirements.some((r) => r.requirement === key)) {
      requirements.push({
        requirement: key,
        category: "responsibility",
        status: evidence.length ? "partial" : "missing",
        evidence,
      });
    }
  });

  const strongKeywords = requirements.filter((r) => r.status === "strong").map((r) => r.requirement);
  const missingKeywords = requirements.filter((r) => r.status === "missing").map((r) => r.requirement);
  const weakKeywords = requirements.filter((r) => r.status === "partial").map((r) => r.requirement);

  const jobSkillSet = new Set([
    ...analysis.hardSkills,
    ...analysis.tools,
    ...analysis.softSkills,
  ].map((s) => s.toLowerCase()));

  const resumeSkillSet = new Set(input.resume.skills.map((s) => s.name.toLowerCase()));

  const skillsInJobNotResume = [...jobSkillSet].filter(
    (s) => !resumeSkillSet.has(s) && !resumeText.includes(s)
  ).slice(0, 20);

  const skillsInResumeNotJob = [...resumeSkillSet].filter((s) => !jobSkillSet.has(s) && !resumeText.match(new RegExp(s, "i"))).slice(0, 15);

  const keywordMatches = topKeywords.filter((kw) => resumeText.includes(kw.term.toLowerCase())).length;
  const keywordScore = topKeywords.length ? Math.round((keywordMatches / topKeywords.length) * 100) : 0;

  const hardMatches = analysis.hardSkills.filter((s) => resumeText.includes(s.toLowerCase())).length;
  const hardSkillScore = analysis.hardSkills.length
    ? Math.round((hardMatches / analysis.hardSkills.length) * 100)
    : 50;

  const softMatches = analysis.softSkills.filter((s) => resumeText.includes(s.toLowerCase())).length;
  const softSkillScore = analysis.softSkills.length
    ? Math.round((softMatches / analysis.softSkills.length) * 100)
    : 60;

  const expRelevant = input.resume.experiences.filter((e) => {
    const blob = `${e.title} ${e.organization}`.toLowerCase();
    return analysis.themes.some((t) => blob.includes(t.replace(/-/g, " "))) ||
      input.jobCategory.split("-").some((c) => blob.includes(c));
  });
  const experienceScore = input.resume.experiences.length
    ? Math.round((expRelevant.length / input.resume.experiences.length) * 100)
    : 0;

  const projRelevant = input.resume.projects.filter((p) => {
    const blob = `${p.name} ${p.techStack ?? ""}`.toLowerCase();
    return analysis.tools.some((t) => blob.includes(t.toLowerCase()));
  });
  const projectScore = input.resume.projects.length
    ? Math.round((projRelevant.length / input.resume.projects.length) * 100)
    : 0;

  const educationScore = input.resume.educations.length ? 75 : 30;
  const responsibilityScore = Math.round(
    (requirements.filter((r) => r.category === "responsibility" && r.status !== "missing").length /
      Math.max(1, requirements.filter((r) => r.category === "responsibility").length)) * 100
  ) || 50;

  const ats = simulateATS(
    {
      profile: input.resume.profile,
      bullets: input.resume.bullets.map((b) => b.text),
      skills: input.resume.skills.map((s) => s.name),
      sections: input.resume.sections.map((s) => s.title),
      plainText: resumeText,
    },
    topKeywords.map((k) => k.term)
  );

  const evidenceStrength = Math.round(
    (requirements.filter((r) => r.status === "strong").length / Math.max(1, requirements.length)) * 100
  );

  const overallScore = Math.round(
    keywordScore * 0.25 +
      hardSkillScore * 0.2 +
      softSkillScore * 0.1 +
      experienceScore * 0.1 +
      projectScore * 0.1 +
      educationScore * 0.05 +
      responsibilityScore * 0.1 +
      ats.totalScore * 0.1
  );

  const tailoringConfidence = evidenceStrength;

  const jobKwLower = topKeywords.map((k) => k.term.toLowerCase());
  const recommendedBulletsAdd = input.resume.bullets
    .map((b) => ({
      id: b.id,
      text: b.text,
      score: scoreBullet(b.text, jobKwLower).totalScore +
        (jobKwLower.filter((k) => b.text.toLowerCase().includes(k)).length * 10),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const selectedIds = new Set(input.resume.bullets.map((b) => b.id));
  const allBullets = input.resume.bullets;
  const recommendedBulletsRemove = allBullets
    .filter((b) => {
      const relevance = jobKwLower.filter((k) => b.text.toLowerCase().includes(k)).length;
      return relevance === 0 && scoreBullet(b.text).totalScore < 50;
    })
    .map((b) => ({
      id: b.id,
      text: b.text,
      reason: "Low job relevance and weak bullet score",
    }))
    .slice(0, 5);

  const recommendedProjects = input.resume.projects
    .filter((p) => {
      const blob = `${p.name} ${p.techStack ?? ""}`.toLowerCase();
      return analysis.tools.some((t) => blob.includes(t.toLowerCase()));
    })
    .map((p) => ({ id: p.id, name: p.name }));

  const recommendedExperiences = expRelevant.map((e) => ({
    id: e.id,
    title: `${e.title} @ ${e.organization}`,
  }));

  const recommendedSkillsMove = input.resume.skills
    .filter((s) => jobSkillSet.has(s.name.toLowerCase()))
    .map((s) => s.name)
    .slice(0, 10);

  const sectionWarnings: string[] = [];
  if (missingKeywords.length > 10) {
    sectionWarnings.push(`${missingKeywords.length} important keywords missing — add evidence or new bullets`);
  }
  skillsInJobNotResume.slice(0, 5).forEach((s) => {
    sectionWarnings.push(`Job requires "${s}" but resume lacks proof`);
  });

  const scoreExplanation = [
    `Keyword coverage: ${keywordMatches}/${topKeywords.length} top keywords (${keywordScore}%)`,
    `Hard skills: ${hardMatches}/${analysis.hardSkills.length} matched`,
    `ATS safety: ${ats.totalScore}/100`,
    `Evidence strength: ${evidenceStrength}% of requirements strongly proven`,
    strongKeywords.length ? `Strongest matches: ${strongKeywords.slice(0, 5).join(", ")}` : "No strong keyword matches yet",
    missingKeywords.length ? `Top gaps: ${missingKeywords.slice(0, 5).join(", ")}` : "No critical keyword gaps",
  ];

  return {
    overallScore,
    hardSkillScore,
    softSkillScore,
    keywordScore,
    experienceScore,
    projectScore,
    educationScore,
    responsibilityScore,
    atsFormatScore: ats.totalScore,
    evidenceStrength,
    tailoringConfidence,
    requirements,
    missingKeywords,
    strongKeywords,
    weakKeywords,
    skillsInJobNotResume,
    skillsInResumeNotJob,
    recommendedBulletsAdd,
    recommendedBulletsRemove,
    recommendedProjects,
    recommendedExperiences,
    recommendedSkillsMove,
    sectionWarnings,
    scoreExplanation,
  };
}

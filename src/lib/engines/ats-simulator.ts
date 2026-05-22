import { WEAK_VERBS, VAGUE_PHRASES } from "@/lib/dictionaries/default-keywords";
import { scoreBullet } from "./bullet-scoring";
import type { ATSReport } from "@/lib/types";

interface ATSInput {
  profile: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    linkedIn?: string | null;
    github?: string | null;
  };
  bullets: string[];
  skills: string[];
  sections: string[];
  plainText: string;
  onePageMode?: boolean;
}

const PLACEHOLDER = /lorem ipsum|placeholder|todo|tbd|xxx|\[.*\]/i;
const FIRST_PERSON = /\b(I|me|my|mine)\b/i;

export function simulateATS(input: ATSInput, jobKeywords?: string[]): ATSReport {
  const warnings: ATSReport["warnings"] = [];
  const fixes: ATSReport["fixes"] = [];

  let formattingScore = 0;
  if (input.profile.fullName) formattingScore += 15;
  else fixes.push({ message: "Add your full name", priority: "high" });
  if (input.profile.email) formattingScore += 15;
  else fixes.push({ message: "Add email address", priority: "high" });
  if (input.profile.phone) formattingScore += 10;
  else warnings.push({ message: "Phone number missing", priority: "medium" });
  if (input.profile.linkedIn || input.profile.github) formattingScore += 10;

  const weirdSymbols = /[★●◆►▪♦]/.test(input.plainText);
  if (weirdSymbols) {
    warnings.push({ message: "Resume contains symbols ATS may not parse", priority: "high" });
    fixes.push({ message: "Remove decorative symbols", priority: "high" });
  } else formattingScore += 10;

  const hasTables = /\|{2,}|<table/i.test(input.plainText);
  if (hasTables) warnings.push({ message: "Tables detected — may break ATS parsing", priority: "high" });

  const sectionHeaders = ["experience", "education", "skills", "projects"];
  const foundSections = sectionHeaders.filter((s) =>
    input.sections.some((sec) => sec.toLowerCase().includes(s)) ||
    input.plainText.toLowerCase().includes(s)
  );
  let sectionScore = Math.min(100, foundSections.length * 20);
  if (foundSections.length < 2) {
    fixes.push({ message: "Add standard sections: Experience, Education, Skills", priority: "high" });
  }

  const bulletScores = input.bullets.map((b) => scoreBullet(b, jobKeywords));
  const avgBullet = bulletScores.length
    ? bulletScores.reduce((s, b) => s + b.totalScore, 0) / bulletScores.length
    : 0;
  const bulletScore = Math.round(avgBullet);

  const withMetrics = bulletScores.filter((b) => b.hasMetric).length;
  const impactScore = input.bullets.length
    ? Math.round((withMetrics / input.bullets.length) * 100)
    : 0;
  if (impactScore < 50) {
    fixes.push({ message: "Add metrics to more bullets (%, numbers, scale)", priority: "high" });
  }

  const skillsScore = Math.min(100, input.skills.length * 8);
  if (input.skills.length < 5) {
    warnings.push({ message: "Few hard skills listed", priority: "medium" });
    fixes.push({ message: "Add more skills with evidence in bullets", priority: "medium" });
  }

  let keywordScore = 50;
  if (jobKeywords?.length) {
    const lower = input.plainText.toLowerCase();
    const matched = jobKeywords.filter((k) => lower.includes(k.toLowerCase())).length;
    keywordScore = Math.round((matched / jobKeywords.length) * 100);
    if (keywordScore < 50) {
      fixes.push({ message: `Only ${matched}/${jobKeywords.length} job keywords found — add evidence-backed keywords`, priority: "high" });
    }
  }

  const wordCount = input.plainText.split(/\s+/).length;
  let lengthScore = 100;
  if (input.onePageMode !== false && wordCount > 600) {
    lengthScore = 60;
    warnings.push({ message: "Resume may exceed one page in plain text", priority: "medium" });
    fixes.push({ message: "Trim content or disable one-page mode", priority: "medium" });
  }
  if (wordCount < 150) {
    lengthScore = 40;
    warnings.push({ message: "Resume seems very short", priority: "medium" });
  }

  input.bullets.forEach((b, i) => {
    if (PLACEHOLDER.test(b)) {
      warnings.push({ message: `Bullet ${i + 1} has placeholder text`, priority: "high" });
    }
    if (FIRST_PERSON.test(b)) {
      warnings.push({ message: `Bullet ${i + 1} uses first person — use implied subject`, priority: "low" });
    }
    if (WEAK_VERBS.some((v) => b.toLowerCase().includes(v))) {
      warnings.push({ message: `Bullet ${i + 1} uses weak verb`, priority: "medium" });
    }
    if (VAGUE_PHRASES.some((p) => b.toLowerCase().includes(p))) {
      warnings.push({ message: `Bullet ${i + 1} has vague phrasing`, priority: "medium" });
    }
  });

  const uniqueBullets = new Set(input.bullets.map((b) => b.toLowerCase().trim()));
  if (uniqueBullets.size < input.bullets.length) {
    warnings.push({ message: "Duplicate bullets detected", priority: "high" });
    fixes.push({ message: "Remove repeated bullets", priority: "high" });
  }

  const totalScore = Math.round(
    (formattingScore * 0.2 +
      sectionScore * 0.1 +
      bulletScore * 0.2 +
      impactScore * 0.15 +
      skillsScore * 0.1 +
      keywordScore * 0.15 +
      lengthScore * 0.1)
  );

  return {
    totalScore: Math.min(100, totalScore),
    formattingScore,
    keywordScore,
    skillsScore,
    bulletScore,
    impactScore,
    sectionScore,
    lengthScore,
    warnings,
    fixes,
  };
}

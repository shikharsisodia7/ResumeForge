import { WEAK_VERBS, STRONG_VERBS, VAGUE_PHRASES } from "@/lib/dictionaries/default-keywords";
import type { BulletScoreBreakdown } from "@/lib/types";

const METRIC_PATTERN = /\d+%?|\$\d+|\d+\+?\s*(users|customers|people|team|members|projects|hours|days|weeks|months)|\d+x|top\s*\d+%?|#\d+/i;

export function scoreBullet(text: string, jobKeywords?: string[]): BulletScoreBreakdown {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  const lower = trimmed.toLowerCase();
  const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

  let actionVerb = 0;
  let weakVerb: string | undefined;
  const betterVerbs: string[] = [];

  if (STRONG_VERBS.some((v) => firstWord === v || lower.startsWith(v))) {
    actionVerb = 15;
  } else if (WEAK_VERBS.some((v) => lower.includes(v))) {
    actionVerb = 3;
    weakVerb = WEAK_VERBS.find((v) => lower.includes(v));
    betterVerbs.push(
      ...STRONG_VERBS.filter((v) => !lower.includes(v)).slice(0, 5)
    );
  } else {
    actionVerb = 8;
    betterVerbs.push(...STRONG_VERBS.slice(0, 4));
  }

  const hasTool = /\b(?:using|with|via|in)\s+\w+|\b(?:React|Python|SQL|Java|AWS|Docker|Excel|Tableau|Figma|Git)\b/i.test(trimmed) ||
    /\b(?:API|SDK|framework|library|database|cloud|tool)\b/i.test(trimmed);
  const specificTask = hasTool || words.length >= 8 ? 15 : words.length >= 5 ? 10 : 5;

  const toolSkill = hasTool ? 15 : /\b(?:developed|built|designed|implemented|analyzed)\b/i.test(trimmed) ? 10 : 5;

  const hasMetric = METRIC_PATTERN.test(trimmed);
  const measurableImpact = hasMetric ? 20 : lower.includes("significant") || lower.includes("improved") ? 8 : 3;

  const hasOutcome = /\b(?:resulting|leading to|achieving|enabling|increasing|reducing|improving|delivered|achieved)\b/i.test(trimmed) ||
    hasMetric;
  const clearOutcome = hasOutcome ? 15 : 6;

  const wordCount = words.length;
  let goodLength = 0;
  if (wordCount >= 12 && wordCount <= 30) goodLength = 10;
  else if (wordCount >= 8 && wordCount <= 35) goodLength = 6;
  else goodLength = 2;

  const hasFiller = VAGUE_PHRASES.some((p) => lower.includes(p));
  const noFiller = hasFiller ? 2 : 10;

  const totalScore = Math.min(
    100,
    actionVerb + specificTask + toolSkill + measurableImpact + clearOutcome + goodLength + noFiller
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (actionVerb >= 12) strengths.push("Strong action verb opening");
  else weaknesses.push("Weak or missing action verb");
  if (hasMetric) strengths.push("Includes measurable impact");
  else {
    weaknesses.push("Missing quantifiable metric");
    suggestions.push("Add a number: users impacted, % improvement, time saved, or team size");
  }
  if (hasTool) strengths.push("Mentions tools or technologies");
  else suggestions.push("Name a specific tool, technology, or method you used");
  if (hasOutcome) strengths.push("Shows clear outcome");
  else suggestions.push("Add what changed after your work (result, impact, deliverable)");
  if (wordCount > 35) {
    weaknesses.push("Bullet may be too long");
    suggestions.push("Trim to 1-2 lines (~20-28 words) for ATS readability");
  }
  if (wordCount < 8) {
    weaknesses.push("Bullet may be too short");
    suggestions.push("Add context: what you did, how, and the result");
  }
  if (hasFiller) {
    weaknesses.push("Contains vague filler phrases");
    suggestions.push("Replace vague words with specifics");
  }

  if (jobKeywords?.length) {
    const matched = jobKeywords.filter((k) => lower.includes(k.toLowerCase()));
    if (matched.length) strengths.push(`Matches ${matched.length} job keyword(s)`);
    else suggestions.push("Consider weaving relevant job keywords if you have evidence");
  }

  return {
    totalScore,
    actionVerb,
    specificTask,
    toolSkill,
    measurableImpact,
    clearOutcome,
    goodLength,
    noFiller,
    strengths,
    weaknesses,
    suggestions,
    betterVerbs,
    hasMetric,
    weakVerb,
  };
}

export function compareBullets(a: string, b: string) {
  const scoreA = scoreBullet(a);
  const scoreB = scoreBullet(b);
  return {
    a: scoreA,
    b: scoreB,
    winner: scoreA.totalScore >= scoreB.totalScore ? "a" : "b",
    diff: Math.abs(scoreA.totalScore - scoreB.totalScore),
  };
}

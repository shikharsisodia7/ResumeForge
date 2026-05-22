import { scoreBullet } from "@/lib/engines/bullet-scoring";

/** Map heuristic breakdown into Prisma `Bullet` numeric score columns. */
export function bulletScoresFromText(text: string, jobKeywords?: string[]) {
  const b = scoreBullet(text, jobKeywords);
  const kwMatch = jobKeywords?.length
    ? jobKeywords.filter((k) => text.toLowerCase().includes(k.toLowerCase())).length
    : 0;
  return {
    strengthScore: Math.min(100, Math.round((b.actionVerb / 15) * 100)),
    clarityScore: Math.min(
      100,
      Math.round(((b.clearOutcome + b.goodLength + b.noFiller) / 40) * 100)
    ),
    specificityScore: Math.min(
      100,
      Math.round(((b.specificTask + b.toolSkill) / 30) * 100)
    ),
    impactScore: Math.min(100, Math.round((b.measurableImpact / 20) * 100)),
    keywordScore: jobKeywords?.length ? Math.min(100, kwMatch * 15) : 0,
    atsScore: Math.min(100, Math.round(((b.goodLength + b.noFiller) / 20) * 100)),
    totalScore: b.totalScore,
  };
}

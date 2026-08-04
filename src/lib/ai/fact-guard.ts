import type { ResumeContent } from "@/lib/schemas/resume-content";
import { AiOutputError } from "@/lib/errors";

const STAT_PATTERN = /\d+(?:\.\d+)?\s?%|\$\s?\d[\d,]*(?:\.\d+)?[kKmMbB]?|\b\d+(?:\.\d+)?x\b/gi;

function normalizeStat(token: string): string {
  return token.toLowerCase().replace(/\s+/g, "");
}

function extractStats(content: ResumeContent): Set<string> {
  const text = flattenBulletText(content);
  const matches = text.match(STAT_PATTERN) ?? [];
  return new Set(matches.map(normalizeStat));
}

function flattenBulletText(content: ResumeContent): string {
  const parts: string[] = [content.summary ?? ""];
  for (const e of content.experience) parts.push(...e.bullets);
  for (const p of content.projects) parts.push(...p.bullets);
  for (const e of content.education) parts.push(...e.highlights);
  for (const a of content.awards) parts.push(a.description ?? "");
  for (const s of content.additional) parts.push(...s.items);
  return parts.join(" \n ");
}

function flattenAllText(content: ResumeContent): string {
  const parts: string[] = [flattenBulletText(content), content.basics.fullName];
  for (const e of content.experience) parts.push(e.organization, e.title);
  for (const e of content.education) parts.push(e.institution, e.degree ?? "", e.fieldOfStudy ?? "");
  for (const p of content.projects) parts.push(p.name);
  for (const c of content.certifications) parts.push(c.name, c.issuer ?? "");
  for (const a of content.awards) parts.push(a.title, a.issuer ?? "");
  for (const g of content.skills) parts.push(...g.items);
  return parts.join(" \n ").toLowerCase();
}

/**
 * A best-effort guard, not a proof — but it catches the two most damaging
 * failure modes: a new number appearing out of nowhere (fabricated metric),
 * and a new named entity (employer/school/project/cert) that doesn't trace
 * back to the source resume at all.
 */
export function assertNoFabrication(baseContent: ResumeContent, newContent: ResumeContent): void {
  const baseStats = extractStats(baseContent);
  const newStats = extractStats(newContent);
  const inventedStats = [...newStats].filter((stat) => !baseStats.has(stat));
  if (inventedStats.length > 0) {
    throw new AiOutputError(
      "The AI's response introduced a statistic that wasn't in your original resume, so it was rejected. Please try rephrasing your request.",
    );
  }

  const baseText = flattenAllText(baseContent);
  const newNamedEntities = [
    ...newContent.experience.map((e) => e.organization),
    ...newContent.education.map((e) => e.institution),
    ...newContent.projects.map((p) => p.name),
    ...newContent.certifications.map((c) => c.name),
    ...newContent.awards.map((a) => a.title),
  ].filter((name) => name && name.trim().length > 0);

  for (const name of newNamedEntities) {
    if (!baseText.includes(name.toLowerCase().trim())) {
      throw new AiOutputError(
        `The AI's response referenced "${name}", which doesn't appear in your original resume, so it was rejected. Please try rephrasing your request.`,
      );
    }
  }
}

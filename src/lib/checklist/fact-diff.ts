import type { ResumeContent } from "@/lib/schemas/resume-content";
import { extractStats, flattenAllText } from "@/lib/ai/fact-guard";

/**
 * Named entities that appear in `content` but are not, even as a loose
 * substring, traceable back to `sourceText` — plus any statistic (%, $,
 * "Nx") that appears in `content`'s bullets but nowhere in `sourceText`.
 * Mirrors fact-guard.ts's content-vs-content diff, but against raw upload
 * text instead — used only for the read-only checklist, never to block a
 * save (that's still fact-guard.ts's job for customize/tailor).
 */
export function findInventedFacts(sourceText: string, content: ResumeContent): string[] {
  const sourceLower = sourceText.toLowerCase();
  const sourceStats = extractStats(sourceText);
  const contentStats = extractStats(flattenAllText(content));
  const invented: string[] = [...contentStats].filter((stat) => !sourceStats.has(stat));

  const namedEntities = [
    ...content.experience.map((e) => e.organization),
    ...content.education.map((e) => e.institution),
    ...content.projects.map((p) => p.name),
    ...content.certifications.map((c) => c.name),
    ...content.awards.map((a) => a.title),
  ].filter((name) => name && name.trim().length > 0);

  for (const name of namedEntities) {
    if (!sourceLower.includes(name.toLowerCase().trim())) {
      invented.push(name);
    }
  }

  return invented;
}

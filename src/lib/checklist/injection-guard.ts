import type { ResumeContent } from "@/lib/schemas/resume-content";
import { stringFields } from "@/lib/ai/leak-guard";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?(previous|prior|the) instructions?/i,
  /disregard (the )?(above|previous|all prior)/i,
  /you are now (a|an)/i,
  /system prompt/i,
  /\bnew instructions?:/i,
];

/**
 * Scans final resume content for text that reads as an instruction aimed at
 * an AI system, rather than resume prose — evidence that a prompt-injection
 * attempt embedded in the original upload leaked through instead of being
 * treated as inert data. A correct pipeline should never surface this; see
 * fixture "29-prompt-injection-in-bullets" for the source scenario this
 * guards against.
 */
export function findInjectionResidue(content: ResumeContent): string[] {
  const hits: string[] = [];
  for (const field of stringFields(content)) {
    if (INJECTION_PATTERNS.some((pattern) => pattern.test(field))) hits.push(field);
  }
  return hits;
}

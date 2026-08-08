import type { ResumeContent } from "@/lib/schemas/resume-content";
import { AiOutputError } from "@/lib/errors";

/**
 * Patterns that indicate the model leaked conversational wrapper text,
 * markup, or commentary into what should be pure resume content — e.g. a
 * summary that starts with "Here is the formatted resume:" or a bullet that
 * accidentally contains a Markdown code fence. The structured-output schema
 * guarantees *shape* (it's still just a string field), not that the string's
 * *content* is actually resume prose, so this is a separate, deterministic
 * check independent of schema validation.
 */
const LEAK_PATTERNS: RegExp[] = [
  /here('?s| is)\s+(the|your)\s+(formatted|updated|revised)\s+resume/i,
  /as an ai (language model|assistant)/i,
  /i('m| am) (an ai|unable to|sorry)/i,
  /```/,
  /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i, // stray HTML tags
  /^\s*\{[\s\S]*"[a-zA-Z]+"\s*:/, // a raw JSON object leaking through as text
  /\[INST\]|<\|.*?\|>/, // model-internal instruction/chat-turn tokens
];

function stringFields(content: ResumeContent): string[] {
  const fields: string[] = [content.basics.fullName, content.summary ?? ""];
  for (const e of content.experience) fields.push(e.title, e.organization, ...e.bullets);
  for (const e of content.education) fields.push(e.institution, ...e.highlights);
  for (const p of content.projects) fields.push(p.name, ...p.bullets);
  for (const c of content.certifications) fields.push(c.name);
  for (const a of content.awards) fields.push(a.title, a.description ?? "");
  for (const s of content.skills) fields.push(...s.items);
  for (const s of content.additional) fields.push(s.title, ...s.items);
  return fields.filter(Boolean);
}

/**
 * Rejects AI output that contains leaked model commentary, chat wrapper
 * text, or raw markup instead of clean resume content. A best-effort,
 * deterministic complement to the prompt instructions — not a substitute
 * for them.
 */
export function assertNoLeakedCommentary(content: ResumeContent): void {
  for (const field of stringFields(content)) {
    for (const pattern of LEAK_PATTERNS) {
      if (pattern.test(field)) {
        throw new AiOutputError(
          "The AI's response included non-resume commentary or markup, so it was rejected. Please try again.",
        );
      }
    }
  }
}

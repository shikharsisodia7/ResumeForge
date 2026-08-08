import { buildExtractionUserPrompt, EXTRACTION_SYSTEM_PROMPT } from "@/lib/ai/prompts/extraction";
import { assertNoLeakedCommentary } from "@/lib/ai/leak-guard";
import { callStructured } from "@/lib/ai/structured-call";
import { hydrateResumeContent, resumeContentInputSchema, type ResumeContent } from "@/lib/schemas/resume-content";

/** Converts raw extracted resume text into validated structured content. */
export async function runExtraction(sourceText: string): Promise<ResumeContent> {
  const input = await callStructured({
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildExtractionUserPrompt(sourceText),
    schema: resumeContentInputSchema,
    schemaName: "resume_content",
  });
  const content = hydrateResumeContent(input);
  assertNoLeakedCommentary(content);
  return content;
}

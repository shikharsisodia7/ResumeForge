import { assertNoFabrication } from "@/lib/ai/fact-guard";
import { buildTailorUserPrompt, TAILOR_SYSTEM_PROMPT } from "@/lib/ai/prompts/tailor";
import { callStructured } from "@/lib/ai/structured-call";
import { hydrateResumeContent, type ResumeContent } from "@/lib/schemas/resume-content";
import { tailorResultSchema } from "@/lib/schemas/customization";

export async function runTailoring(params: {
  baseContent: ResumeContent;
  targetCompany?: string;
  targetRole?: string;
  jobDescription: string;
}): Promise<{ content: ResumeContent; explanation: string }> {
  const result = await callStructured({
    systemPrompt: TAILOR_SYSTEM_PROMPT,
    userPrompt: buildTailorUserPrompt({
      currentContentJson: JSON.stringify(params.baseContent),
      targetCompany: params.targetCompany,
      targetRole: params.targetRole,
      jobDescription: params.jobDescription,
    }),
    schema: tailorResultSchema,
    schemaName: "tailor_result",
  });

  const content = hydrateResumeContent(result.content);
  assertNoFabrication(params.baseContent, content);

  return { content, explanation: result.explanation };
}

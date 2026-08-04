import { assertNoFabrication } from "@/lib/ai/fact-guard";
import { buildCustomizeUserPrompt, CUSTOMIZE_SYSTEM_PROMPT } from "@/lib/ai/prompts/customize";
import { callStructured } from "@/lib/ai/structured-call";
import { customizationResultSchema } from "@/lib/schemas/customization";
import { hydrateResumeContent, type ResumeContent } from "@/lib/schemas/resume-content";
import { applyStylePatch, type ResumeStyle } from "@/lib/schemas/resume-style";

export interface CustomizationOutcome {
  rejected: boolean;
  explanation: string;
  content: ResumeContent | null;
  style: ResumeStyle | null;
}

/**
 * Applies one natural-language customization instruction to a resume
 * version's current content/style. `baseContent` (the version's immutable
 * original AI-formatted snapshot) is the fact anchor the fabrication guard
 * checks against, independent of how many customizations have since layered
 * on top of `currentContent`.
 */
export async function runCustomization(params: {
  baseContent: ResumeContent;
  currentContent: ResumeContent;
  currentStyle: ResumeStyle;
  instruction: string;
}): Promise<CustomizationOutcome> {
  const { baseContent, currentContent, currentStyle, instruction } = params;

  const result = await callStructured({
    systemPrompt: CUSTOMIZE_SYSTEM_PROMPT,
    userPrompt: buildCustomizeUserPrompt({
      currentContentJson: JSON.stringify(currentContent),
      currentStyleJson: JSON.stringify(currentStyle),
      instruction,
    }),
    schema: customizationResultSchema,
    schemaName: "customization_result",
  });

  if (result.action === "reject") {
    return {
      rejected: true,
      explanation: result.rejectionReason ?? result.explanation,
      content: null,
      style: null,
    };
  }

  let nextStyle: ResumeStyle | null = null;
  if (result.stylePatch) {
    nextStyle = applyStylePatch(currentStyle, result.stylePatch);
  }

  let nextContent: ResumeContent | null = null;
  if (result.content) {
    nextContent = hydrateResumeContent(result.content);
    assertNoFabrication(baseContent, nextContent);
  }

  return {
    rejected: false,
    explanation: result.explanation,
    content: nextContent,
    style: nextStyle,
  };
}

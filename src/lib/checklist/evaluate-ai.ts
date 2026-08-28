import type { ResumeContent } from "@/lib/schemas/resume-content";
import { callStructured } from "@/lib/ai/structured-call";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { AI_JUDGED_ITEM_IDS } from "@/lib/checklist/definitions";
import { checklistAiVerdictSchema } from "@/lib/checklist/ai-judged-schema";
import { CHECKLIST_SYSTEM_PROMPT, buildChecklistUserPrompt } from "@/lib/ai/prompts/checklist";
import type { ChecklistItemResult } from "@/lib/checklist/mechanical-checks";

/** Never throws — a checklist that can't reach the model degrades every
 * AI-judged item to a warning instead of failing the whole checklist run. */
export async function evaluateAiJudgedChecklist(content: ResumeContent, sourceText: string): Promise<ChecklistItemResult[]> {
  try {
    const verdict = await callStructured({
      systemPrompt: CHECKLIST_SYSTEM_PROMPT,
      userPrompt: buildChecklistUserPrompt({ sourceText, formattedContentJson: JSON.stringify(content) }),
      schema: checklistAiVerdictSchema,
      schemaName: "checklist_verdict",
    });
    return verdict.items;
  } catch (error) {
    console.error("[checklist] AI-judged evaluation failed, degrading to warnings", {
      modelId: AI_MODEL_ID,
      message: error instanceof Error ? error.message : String(error),
    });
    return AI_JUDGED_ITEM_IDS.map((id) => ({
      id,
      status: "warning" as const,
      detail: "AI review was temporarily unavailable for this item.",
    }));
  }
}

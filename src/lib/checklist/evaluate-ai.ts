import type { ResumeContent } from "@/lib/schemas/resume-content";
import { callStructured } from "@/lib/ai/structured-call";
import { AI_MODEL_ID } from "@/lib/ai/model";
import { AI_JUDGED_ITEM_IDS } from "@/lib/checklist/definitions";
import { checklistAiVerdictSchema } from "@/lib/checklist/ai-judged-schema";
import { CHECKLIST_SYSTEM_PROMPT, buildChecklistUserPrompt } from "@/lib/ai/prompts/checklist";
import type { ChecklistItemResult } from "@/lib/checklist/mechanical-checks";

export interface AiJudgedChecklistOutcome {
  /** Exactly one result per AI_JUDGED_ITEM_IDS entry, in that order. */
  items: ChecklistItemResult[];
  /** True when the model call failed and every item was degraded to a
   * warning — i.e. these are placeholders, not a real AI verdict. Callers
   * that must distinguish "the AI approved this" from "the AI never ran"
   * (e.g. scripts/run-checklist-evals.ts) key off this. */
  degraded: boolean;
}

/** Never throws — a checklist that can't reach the model degrades every
 * AI-judged item to a warning instead of failing the whole checklist run. */
export async function evaluateAiJudgedChecklist(content: ResumeContent, sourceText: string): Promise<AiJudgedChecklistOutcome> {
  try {
    const verdict = await callStructured({
      systemPrompt: CHECKLIST_SYSTEM_PROMPT,
      userPrompt: buildChecklistUserPrompt({ sourceText, formattedContentJson: JSON.stringify(content) }),
      schema: checklistAiVerdictSchema,
      schemaName: "checklist_verdict",
    });
    // checklistAiVerdictSchema enforces "7 items, each with a valid id" but
    // NOT that the 7 ids are distinct: a model returning GRAM-001 twice and
    // omitting FACT-001 still validates. Normalizing by id here (rather than
    // returning verdict.items raw) keeps this function's contract — exactly
    // one result per AI_JUDGED_ITEM_IDS entry — true regardless, so
    // runChecklistEvaluation's merge can never hit a missing id and throw an
    // unhandled 500 out of the API route.
    const byId = new Map(verdict.items.map((i) => [i.id, i]));
    const items: ChecklistItemResult[] = AI_JUDGED_ITEM_IDS.map(
      (id) =>
        byId.get(id) ?? {
          id,
          status: "warning" as const,
          detail: "AI review didn't return a verdict for this item.",
        },
    );
    return { items, degraded: false };
  } catch (error) {
    console.error("[checklist] AI-judged evaluation failed, degrading to warnings", {
      modelId: AI_MODEL_ID,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      items: AI_JUDGED_ITEM_IDS.map((id) => ({
        id,
        status: "warning" as const,
        detail: "AI review was temporarily unavailable for this item.",
      })),
      degraded: true,
    };
  }
}

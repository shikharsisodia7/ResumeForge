import type { ResumeContent } from "@/lib/schemas/resume-content";
import type { ResumeStyle } from "@/lib/schemas/resume-style";
import { renderResumePdf } from "@/lib/pdf/render";
import { inspectPdf } from "@/lib/pdf/inspect";
import { CHECKLIST_ITEMS, checklistItemById, type ChecklistCategory, type ChecklistItemKind } from "@/lib/checklist/definitions";
import { evaluateMechanicalChecklist, type ChecklistItemResult, type ChecklistItemStatus } from "@/lib/checklist/mechanical-checks";
import { evaluateAiJudgedChecklist } from "@/lib/checklist/evaluate-ai";

export interface ChecklistRunItem extends ChecklistItemResult {
  category: ChecklistCategory;
  label: string;
  kind: ChecklistItemKind;
}

export interface ChecklistRunResult {
  overallStatus: ChecklistItemStatus;
  items: ChecklistRunItem[];
  /** True when the AI-judged half never really ran: the model call failed and
   * every AI item was degraded to a warning. `overallStatus` alone cannot
   * express this (a total AI outage reads as "warning", not "failed"), so any
   * caller that needs to distinguish a real verdict from a placeholder one —
   * notably scripts/run-checklist-evals.ts — must check this flag. */
  aiDegraded: boolean;
}

function overallStatusOf(results: ChecklistItemResult[]): ChecklistItemStatus {
  if (results.some((r) => r.status === "failed")) return "failed";
  if (results.some((r) => r.status === "warning")) return "warning";
  return "passed";
}

export async function runChecklistEvaluation(params: {
  content: ResumeContent;
  style: ResumeStyle;
  sourceText: string;
  resume: { mimeType: string };
}): Promise<ChecklistRunResult> {
  const { content, style, sourceText, resume } = params;

  const pdfBuffer = await renderResumePdf(content, style);
  const inspection = await inspectPdf(pdfBuffer);

  const [mechanicalResults, aiOutcome] = await Promise.all([
    evaluateMechanicalChecklist({ content, style, sourceText, resume, pdfBuffer, inspection }),
    evaluateAiJudgedChecklist(content, sourceText),
  ]);

  const byId = new Map([...mechanicalResults, ...aiOutcome.items].map((r) => [r.id, r]));

  const items: ChecklistRunItem[] = CHECKLIST_ITEMS.map((def) => {
    const result = byId.get(def.id);
    if (!result) throw new Error(`Checklist evaluation produced no result for ${def.id}`);
    return { ...result, category: def.category, label: checklistItemById(def.id).label, kind: def.kind };
  });

  return { overallStatus: overallStatusOf(items), items, aiDegraded: aiOutcome.degraded };
}

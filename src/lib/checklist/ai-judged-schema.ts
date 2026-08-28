import { z } from "zod";
import { AI_JUDGED_ITEM_IDS } from "@/lib/checklist/definitions";

export const checklistAiVerdictSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.enum(AI_JUDGED_ITEM_IDS as [string, ...string[]]),
        status: z.enum(["passed", "warning", "failed"]),
        detail: z.string().min(1).max(300),
      }),
    )
    .length(AI_JUDGED_ITEM_IDS.length),
});

export type ChecklistAiVerdict = z.infer<typeof checklistAiVerdictSchema>;

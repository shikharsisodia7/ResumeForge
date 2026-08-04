import { z } from "zod";
import { resumeContentInputSchema } from "@/lib/schemas/resume-content";
import { resumeStylePatchSchema } from "@/lib/schemas/resume-style";

/**
 * What the customization agent must return for a free-text instruction like
 * "make my name bigger and bold it" or "tighten my summary". The model
 * chooses one `action`; the corresponding payload is required, everything
 * else is omitted. `reject` is a first-class outcome — instructions that
 * would require inventing facts or unsupported styling must be rejected,
 * not guessed at.
 */
export const customizationResultSchema = z
  .object({
    action: z.enum(["style", "content", "both", "reject"]),
    stylePatch: resumeStylePatchSchema.optional(),
    content: resumeContentInputSchema.optional(),
    explanation: z.string().min(1).max(600),
    rejectionReason: z.string().max(600).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action === "reject" && !val.rejectionReason) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "rejectionReason is required when action is 'reject'",
      });
    }
    if ((val.action === "style" || val.action === "both") && !val.stylePatch) {
      ctx.addIssue({
        code: "custom",
        path: ["stylePatch"],
        message: "stylePatch is required when action includes a style change",
      });
    }
    if ((val.action === "content" || val.action === "both") && !val.content) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "content is required when action includes a content change",
      });
    }
  });

export type CustomizationResult = z.infer<typeof customizationResultSchema>;

/** Output of the job-description-driven tailoring agent. */
export const tailorResultSchema = z.object({
  content: resumeContentInputSchema,
  explanation: z.string().min(1).max(600),
});

export type TailorResult = z.infer<typeof tailorResultSchema>;

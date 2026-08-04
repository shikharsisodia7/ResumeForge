import { z } from "zod";
import { AiOutputError } from "@/lib/errors";

/**
 * Constrained visual-presentation settings. Deliberately a closed set of
 * enums/bounded numbers rather than free-form CSS — the AI (and users, via
 * natural-language instructions) can only ever select from *these* knobs,
 * never emit arbitrary markup or styling.
 */

export const SECTION_KEYS = [
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "awards",
  "additional",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const sectionOrderSchema = z
  .array(z.enum(SECTION_KEYS))
  .length(SECTION_KEYS.length)
  .refine((order) => new Set(order).size === SECTION_KEYS.length, {
    message: "sectionOrder must contain each section exactly once",
  });

export const resumeStyleSchema = z.object({
  pageSize: z.enum(["letter", "a4"]).default("letter"),
  margins: z.enum(["narrow", "normal", "wide"]).default("normal"),
  fontFamily: z.enum(["helvetica", "times", "courier"]).default("helvetica"),
  baseFontSize: z.number().min(8).max(14).default(10.5),
  lineHeight: z.number().min(1).max(2).default(1.15),
  sectionSpacing: z.number().min(4).max(32).default(12),
  sectionHeadingCase: z.enum(["uppercase", "titlecase"]).default("uppercase"),
  sectionHeadingBold: z.boolean().default(true),
  sectionHeadingDivider: z.boolean().default(true),
  nameFontSize: z.number().min(14).max(36).default(22),
  nameFontWeight: z.enum(["normal", "bold"]).default("bold"),
  headerAlignment: z.enum(["left", "center"]).default("left"),
  bulletIndent: z.number().min(0).max(36).default(14),
  sectionOrder: sectionOrderSchema.default([...SECTION_KEYS]),
});

export type ResumeStyle = z.infer<typeof resumeStyleSchema>;

export const DEFAULT_RESUME_STYLE: ResumeStyle = resumeStyleSchema.parse({});

/** A partial update to style — unknown keys are rejected, not ignored. */
export const resumeStylePatchSchema = resumeStyleSchema.partial().strict();

export type ResumeStylePatch = z.infer<typeof resumeStylePatchSchema>;

/**
 * Merges a (pre-validated-shape) patch into a base style and re-validates
 * the result end to end, so an in-range-per-field but incoherent combination
 * can never slip through.
 */
export function applyStylePatch(base: ResumeStyle, patch: unknown): ResumeStyle {
  const parsedPatch = resumeStylePatchSchema.safeParse(patch);
  if (!parsedPatch.success) {
    throw new AiOutputError(
      `Requested style change isn't supported: ${parsedPatch.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const merged = { ...base, ...parsedPatch.data };
  const revalidated = resumeStyleSchema.safeParse(merged);
  if (!revalidated.success) {
    throw new AiOutputError("Requested style change would produce an invalid layout");
  }
  return revalidated.data;
}

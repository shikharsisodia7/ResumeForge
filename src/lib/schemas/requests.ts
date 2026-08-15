import { z } from "zod";

export const finalizeUploadSchema = z.object({
  pathname: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const createVersionSchema = z.object({
  sourceVersionId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(200),
  targetCompany: z.string().trim().max(200).optional(),
  targetRole: z.string().trim().max(200).optional(),
  jobDescription: z.string().trim().max(10_000).optional(),
});

export const updateVersionSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    targetCompany: z.string().trim().max(200).nullable().optional(),
    targetRole: z.string().trim().max(200).nullable().optional(),
    jobDescription: z.string().trim().max(10_000).nullable().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, { message: "No fields to update" });

export const customizeVersionSchema = z.union([
  z.object({ instruction: z.string().trim().min(1, "Instruction is required").max(2000) }),
  z.object({ promptId: z.string().min(1) }),
]);

export const createPromptSchema = z
  .object({
    text: z.string().trim().min(1, "Prompt text is required").max(2000),
    description: z.string().trim().max(500).optional(),
    isShared: z.boolean().default(false),
  })
  .refine((val) => !val.isShared || (val.description && val.description.length > 0), {
    message: "A description is required to share a prompt with the community",
    path: ["description"],
  });

export const updatePromptSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isShared: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, { message: "No fields to update" })
  .refine((val) => !val.isShared || (val.description === undefined ? true : Boolean(val.description)), {
    message: "A description is required to share a prompt with the community",
    path: ["description"],
  });

export const reorderVersionPromptsSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

export const toggleVersionPromptSchema = z.object({
  isActive: z.boolean(),
});

export const galleryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

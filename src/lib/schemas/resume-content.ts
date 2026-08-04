import { z } from "zod";

/**
 * Structured, factual resume content. This is the only place resume "truth"
 * lives — visual presentation is described separately in `resume-style.ts`.
 *
 * Every entry gets a stable `id` once it enters our system so later edits
 * (reorder, trim, remove) can target a specific item. Language models are
 * unreliable at inventing meaningful unique ids, so the *Input variants
 * below (what we ask the model to return) omit `id`, and `hydrateResumeContent`
 * assigns real ids server-side after the model's output has been validated.
 */

const linkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(500),
});

const basicsSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  location: z.string().max(200).optional(),
  links: z.array(linkSchema).max(10).default([]),
});

const educationEntrySchema = z.object({
  id: z.string(),
  institution: z.string().min(1).max(200),
  degree: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  gpa: z.string().max(20).optional(),
  highlights: z.array(z.string().min(1).max(500)).max(20).default([]),
});

const experienceEntrySchema = z.object({
  id: z.string(),
  organization: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  bullets: z.array(z.string().min(1).max(500)).max(30).default([]),
});

const projectEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  link: z.string().max(500).optional(),
  bullets: z.array(z.string().min(1).max(500)).max(30).default([]),
});

const skillGroupSchema = z.object({
  id: z.string(),
  category: z.string().min(1).max(80),
  items: z.array(z.string().min(1).max(80)).max(60).default([]),
});

const certificationEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).optional(),
  date: z.string().max(40).optional(),
  credentialUrl: z.string().max(500).optional(),
});

const awardEntrySchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  issuer: z.string().max(200).optional(),
  date: z.string().max(40).optional(),
  description: z.string().max(500).optional(),
});

const additionalSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(80),
  items: z.array(z.string().min(1).max(500)).max(30).default([]),
});

export const resumeContentSchema = z.object({
  basics: basicsSchema,
  summary: z.string().max(1200).optional(),
  education: z.array(educationEntrySchema).max(20).default([]),
  experience: z.array(experienceEntrySchema).max(30).default([]),
  projects: z.array(projectEntrySchema).max(30).default([]),
  skills: z.array(skillGroupSchema).max(20).default([]),
  certifications: z.array(certificationEntrySchema).max(20).default([]),
  awards: z.array(awardEntrySchema).max(20).default([]),
  additional: z.array(additionalSectionSchema).max(10).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type ProjectEntry = z.infer<typeof projectEntrySchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;

// --- Input variants: what we ask the model to produce (no ids) ---

const educationEntryInputSchema = educationEntrySchema.omit({ id: true });
const experienceEntryInputSchema = experienceEntrySchema.omit({ id: true });
const projectEntryInputSchema = projectEntrySchema.omit({ id: true });
const skillGroupInputSchema = skillGroupSchema.omit({ id: true });
const certificationEntryInputSchema = certificationEntrySchema.omit({ id: true });
const awardEntryInputSchema = awardEntrySchema.omit({ id: true });
const additionalSectionInputSchema = additionalSectionSchema.omit({ id: true });

export const resumeContentInputSchema = z.object({
  basics: basicsSchema,
  summary: z.string().max(1200).optional(),
  education: z.array(educationEntryInputSchema).max(20).default([]),
  experience: z.array(experienceEntryInputSchema).max(30).default([]),
  projects: z.array(projectEntryInputSchema).max(30).default([]),
  skills: z.array(skillGroupInputSchema).max(20).default([]),
  certifications: z.array(certificationEntryInputSchema).max(20).default([]),
  awards: z.array(awardEntryInputSchema).max(20).default([]),
  additional: z.array(additionalSectionInputSchema).max(10).default([]),
});

export type ResumeContentInput = z.infer<typeof resumeContentInputSchema>;

function withId<T extends object>(item: T): T & { id: string } {
  return { ...item, id: crypto.randomUUID() };
}

/** Assigns stable ids to every entry in freshly-validated model output. */
export function hydrateResumeContent(input: ResumeContentInput): ResumeContent {
  return {
    basics: input.basics,
    summary: input.summary,
    education: input.education.map(withId),
    experience: input.experience.map(withId),
    projects: input.projects.map(withId),
    skills: input.skills.map(withId),
    certifications: input.certifications.map(withId),
    awards: input.awards.map(withId),
    additional: input.additional.map(withId),
  };
}

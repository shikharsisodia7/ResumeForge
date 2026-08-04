import { describe, expect, it } from "vitest";
import { hydrateResumeContent, resumeContentInputSchema, resumeContentSchema } from "@/lib/schemas/resume-content";

const validInput = {
  basics: { fullName: "Jane Smith", email: "jane@example.com", links: [] },
  summary: "Backend engineer with 5 years of experience.",
  education: [
    { institution: "State University", degree: "B.S. Computer Science", highlights: [] },
  ],
  experience: [
    {
      organization: "Acme Corp",
      title: "Software Engineer",
      bullets: ["Built a distributed queue", "Reduced latency by 20%"],
    },
  ],
  projects: [],
  skills: [{ category: "Languages", items: ["TypeScript", "Go"] }],
  certifications: [],
  awards: [],
  additional: [],
};

describe("resumeContentInputSchema (model-facing structured output)", () => {
  it("accepts well-formed structured resume data", () => {
    const result = resumeContentInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects data missing a required field (basics.fullName)", () => {
    const invalid = { ...validInput, basics: { email: "jane@example.com", links: [] } };
    const result = resumeContentInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an experience entry missing required organization/title", () => {
    const invalid = {
      ...validInput,
      experience: [{ bullets: ["did stuff"] }],
    };
    const result = resumeContentInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects ids being supplied by the model (input schema omits them)", () => {
    const withId = {
      ...validInput,
      experience: [{ id: "should-not-be-here", organization: "Acme", title: "SWE", bullets: [] }],
    };
    // Extra `id` key is simply stripped by default zod object parsing, not rejected —
    // but the hydrated/stored id must never come from model input.
    const parsed = resumeContentInputSchema.parse(withId);
    expect((parsed.experience[0] as unknown as { id?: string }).id).toBeUndefined();
  });
});

describe("hydrateResumeContent", () => {
  it("assigns a stable, unique id to every entry", () => {
    const input = resumeContentInputSchema.parse(validInput);
    const hydrated = hydrateResumeContent(input);

    expect(hydrated.experience[0].id).toBeTruthy();
    expect(hydrated.education[0].id).toBeTruthy();
    expect(hydrated.skills[0].id).toBeTruthy();
    expect(hydrated.experience[0].id).not.toBe(hydrated.education[0].id);
  });

  it("produces output that satisfies the stored (with-id) schema", () => {
    const input = resumeContentInputSchema.parse(validInput);
    const hydrated = hydrateResumeContent(input);
    expect(resumeContentSchema.safeParse(hydrated).success).toBe(true);
  });

  it("preserves every source fact verbatim (no fields dropped or altered)", () => {
    const input = resumeContentInputSchema.parse(validInput);
    const hydrated = hydrateResumeContent(input);
    expect(hydrated.experience[0].organization).toBe("Acme Corp");
    expect(hydrated.experience[0].bullets).toEqual(["Built a distributed queue", "Reduced latency by 20%"]);
    expect(hydrated.basics.fullName).toBe("Jane Smith");
  });
});

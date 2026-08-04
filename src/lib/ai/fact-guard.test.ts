import { describe, expect, it } from "vitest";
import { assertNoFabrication } from "@/lib/ai/fact-guard";
import { AiOutputError } from "@/lib/errors";
import { hydrateResumeContent, resumeContentInputSchema, type ResumeContent } from "@/lib/schemas/resume-content";

function makeContent(overrides: Record<string, unknown> = {}): ResumeContent {
  const input = resumeContentInputSchema.parse({
    basics: { fullName: "Jane Smith", links: [] },
    education: [],
    experience: [
      {
        organization: "Acme Corp",
        title: "Software Engineer",
        bullets: ["Reduced latency by 20% for the checkout service"],
      },
    ],
    projects: [],
    skills: [],
    certifications: [],
    awards: [],
    additional: [],
    ...overrides,
  });
  return hydrateResumeContent(input);
}

describe("assertNoFabrication", () => {
  it("allows a rewording that preserves the same facts", () => {
    const base = makeContent();
    const reworded = makeContent({
      experience: [
        {
          organization: "Acme Corp",
          title: "Software Engineer",
          bullets: ["Cut checkout service latency by 20%"],
        },
      ],
    });
    expect(() => assertNoFabrication(base, reworded)).not.toThrow();
  });

  it("rejects a new statistic that wasn't in the source", () => {
    const base = makeContent();
    const withInventedStat = makeContent({
      experience: [
        {
          organization: "Acme Corp",
          title: "Software Engineer",
          bullets: ["Reduced latency by 90% for the checkout service"],
        },
      ],
    });
    expect(() => assertNoFabrication(base, withInventedStat)).toThrow(AiOutputError);
  });

  it("rejects a new employer that doesn't appear anywhere in the source", () => {
    const base = makeContent();
    const withInventedEmployer = makeContent({
      experience: [
        { organization: "Globex Corporation", title: "Software Engineer", bullets: ["Did things"] },
      ],
    });
    expect(() => assertNoFabrication(base, withInventedEmployer)).toThrow(AiOutputError);
  });

  it("rejects a new project name that doesn't trace back to the source", () => {
    const base = makeContent();
    const withInventedProject = makeContent({
      projects: [{ name: "Secret AI Startup", bullets: [] }],
    });
    expect(() => assertNoFabrication(base, withInventedProject)).toThrow(AiOutputError);
  });

  it("allows dropping content (shortening) without throwing", () => {
    const base = makeContent();
    const shortened = makeContent({ experience: [] });
    expect(() => assertNoFabrication(base, shortened)).not.toThrow();
  });
});

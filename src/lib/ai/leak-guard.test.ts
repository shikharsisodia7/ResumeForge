import { describe, expect, it } from "vitest";
import { assertNoLeakedCommentary } from "@/lib/ai/leak-guard";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { hydrateResumeContent } from "@/lib/schemas/resume-content";

describe("assertNoLeakedCommentary", () => {
  it("passes clean resume content", () => {
    const { content } = fixtureById("01-clean-baseline");
    expect(() => assertNoLeakedCommentary(content)).not.toThrow();
  });

  it("rejects a leaked conversational preamble (fixture 32)", () => {
    const { content } = fixtureById("32-ai-commentary-leak");
    expect(() => assertNoLeakedCommentary(content)).toThrow(/commentary/i);
  });

  it("rejects a Markdown code fence inside a bullet", () => {
    const content = hydrateResumeContent({
      basics: { fullName: "Test User", links: [] },
      education: [],
      experience: [
        {
          organization: "Acme",
          title: "Engineer",
          bullets: ["```json\n{\"skill\": \"leaked\"}\n```"],
        },
      ],
      projects: [],
      skills: [],
      certifications: [],
      awards: [],
      additional: [],
    });
    expect(() => assertNoLeakedCommentary(content)).toThrow();
  });

  it("rejects a stray HTML tag", () => {
    const content = hydrateResumeContent({
      basics: { fullName: "Test User", links: [] },
      education: [],
      experience: [{ organization: "Acme", title: "Engineer", bullets: ["Shipped <b>bold</b> new feature"] }],
      projects: [],
      skills: [],
      certifications: [],
      awards: [],
      additional: [],
    });
    expect(() => assertNoLeakedCommentary(content)).toThrow();
  });

  it("does not false-positive on ordinary punctuation like a bare '{' or code-adjacent words", () => {
    const content = hydrateResumeContent({
      basics: { fullName: "Test User", links: [] },
      education: [],
      experience: [
        { organization: "Acme", title: "Engineer", bullets: ["Refactored the assistant module powering search"] },
      ],
      projects: [],
      skills: [],
      certifications: [],
      awards: [],
      additional: [],
    });
    expect(() => assertNoLeakedCommentary(content)).not.toThrow();
  });
});

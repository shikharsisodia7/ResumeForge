import { describe, expect, it } from "vitest";
import { applyStylePatch, DEFAULT_RESUME_STYLE, resumeStylePatchSchema, SECTION_KEYS } from "@/lib/schemas/resume-style";
import { AiOutputError } from "@/lib/errors";

describe("resumeStylePatchSchema", () => {
  it("accepts a partial, in-range patch", () => {
    const result = resumeStylePatchSchema.safeParse({ nameFontSize: 28, nameFontWeight: "bold" });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range numeric value", () => {
    const result = resumeStylePatchSchema.safeParse({ nameFontSize: 999 });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported/unknown style key (closed vocabulary)", () => {
    const result = resumeStylePatchSchema.safeParse({ color: "#ff0000" });
    expect(result.success).toBe(false);
  });

  it("rejects a sectionOrder missing a required section", () => {
    const incomplete = SECTION_KEYS.slice(1); // drop "summary"
    const result = resumeStylePatchSchema.safeParse({ sectionOrder: incomplete });
    expect(result.success).toBe(false);
  });

  it("rejects a sectionOrder with a duplicate entry", () => {
    const withDupe = [...SECTION_KEYS.slice(1), "experience"];
    const result = resumeStylePatchSchema.safeParse({ sectionOrder: withDupe });
    expect(result.success).toBe(false);
  });

  it("accepts a valid full permutation of sectionOrder", () => {
    const reordered = [...SECTION_KEYS].reverse();
    const result = resumeStylePatchSchema.safeParse({ sectionOrder: reordered });
    expect(result.success).toBe(true);
  });
});

describe("applyStylePatch", () => {
  it("merges a valid patch into the base style", () => {
    const next = applyStylePatch(DEFAULT_RESUME_STYLE, { nameFontSize: 30, nameFontWeight: "bold" });
    expect(next.nameFontSize).toBe(30);
    expect(next.nameFontWeight).toBe("bold");
    // untouched fields carry over from base
    expect(next.fontFamily).toBe(DEFAULT_RESUME_STYLE.fontFamily);
  });

  it("throws AiOutputError for an invalid patch instead of silently ignoring it", () => {
    expect(() => applyStylePatch(DEFAULT_RESUME_STYLE, { baseFontSize: 200 })).toThrow(AiOutputError);
  });

  it("throws AiOutputError for a patch containing an unsupported key", () => {
    expect(() => applyStylePatch(DEFAULT_RESUME_STYLE, { textShadow: "1px 1px" })).toThrow(AiOutputError);
  });

  it("never mutates the base style object", () => {
    const baseCopy = { ...DEFAULT_RESUME_STYLE };
    applyStylePatch(DEFAULT_RESUME_STYLE, { nameFontSize: 30 });
    expect(DEFAULT_RESUME_STYLE).toEqual(baseCopy);
  });
});

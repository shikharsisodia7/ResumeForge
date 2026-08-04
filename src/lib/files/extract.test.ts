import { describe, expect, it } from "vitest";
import { normalizeExtractedText } from "@/lib/files/extract";

describe("normalizeExtractedText", () => {
  it("collapses repeated spaces and tabs without touching line breaks", () => {
    const input = "John   Doe\t\tSoftware  Engineer";
    expect(normalizeExtractedText(input)).toBe("John Doe Software Engineer");
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeExtractedText("Line one\r\nLine two\r\n")).toBe("Line one\nLine two");
  });

  it("collapses 3+ blank lines down to a single blank line, preserving paragraph breaks", () => {
    const input = "Summary\n\n\n\nExperience";
    expect(normalizeExtractedText(input)).toBe("Summary\n\nExperience");
  });

  it("preserves bullet characters and structure", () => {
    const input = "Experience\n- Built a thing\n- Shipped another thing";
    expect(normalizeExtractedText(input)).toBe("Experience\n- Built a thing\n- Shipped another thing");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeExtractedText("   \n  hello  \n   ")).toBe("hello");
  });
});

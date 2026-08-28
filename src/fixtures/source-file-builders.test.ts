import { describe, expect, it } from "vitest";
import { buildSourceDocx, buildSourcePdf } from "@/fixtures/source-file-builders";

describe("source-file-builders", () => {
  it("builds a real PDF whose bytes start with the %PDF- magic number", async () => {
    const buffer = await buildSourcePdf(["Jordan Alvarez", "jordan.alvarez@example.com"]);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("builds a real DOCX whose bytes start with the ZIP/OOXML magic number", async () => {
    const buffer = await buildSourceDocx(["Jordan Alvarez", "jordan.alvarez@example.com"]);
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(buffer.length).toBeGreaterThan(100);
  });
});

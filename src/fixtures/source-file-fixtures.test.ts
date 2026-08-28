import { describe, expect, it } from "vitest";
import { SOURCE_FILE_FIXTURES } from "@/fixtures/source-file-fixtures";
import { extractResumeText } from "@/lib/files/extract";
import { validateUploadedFile } from "@/lib/files/validate";
import { ValidationError } from "@/lib/errors";

describe("source file fixtures — extraction pipeline", () => {
  for (const fixture of SOURCE_FILE_FIXTURES) {
    it(`${fixture.id}: ${fixture.description}`, async () => {
      const buffer = await fixture.build();

      if (fixture.expectRejection) {
        expect(() =>
          validateUploadedFile({
            filename: `resume.${fixture.format}`,
            declaredMimeType: fixture.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer,
          }),
        ).toThrowError(expect.objectContaining({ message: expect.stringContaining(fixture.expectRejection.messageIncludes) }));
        return;
      }

      const validated = validateUploadedFile({
        filename: `resume.${fixture.format}`,
        declaredMimeType: fixture.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer,
      });
      expect(validated.kind).toBe(fixture.format);

      const text = await extractResumeText(buffer, fixture.format);
      for (const fact of fixture.requiredFacts ?? []) {
        expect(text, `${fixture.id} missing required fact "${fact}"`).toContain(fact);
      }
      for (const fact of fixture.forbiddenFacts ?? []) {
        expect(text, `${fixture.id} contains forbidden fact "${fact}"`).not.toContain(fact);
      }
    });
  }

  it("sf-10-corrupt-pdf: extractResumeText itself also rejects the corrupt PDF", async () => {
    const buffer = await SOURCE_FILE_FIXTURES.find((f) => f.id === "sf-10-corrupt-pdf")!.build();
    await expect(extractResumeText(buffer, "pdf")).rejects.toThrow(ValidationError);
  });
});

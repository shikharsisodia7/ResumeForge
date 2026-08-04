import { describe, expect, it } from "vitest";
import { sanitizeFilename, validateUploadedFile } from "@/lib/files/validate";
import { ValidationError } from "@/lib/errors";
import { MAX_FILE_SIZE_BYTES } from "@/lib/files/constants";

const PDF_BYTES = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(100, "a")]);
const DOCX_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(100, "a")]);
const TXT_BYTES = Buffer.from("John Doe\nSoftware Engineer\n\nExperience\n- Built things\n");

describe("validateUploadedFile", () => {
  it("accepts a valid PDF whose extension matches its sniffed content", () => {
    const result = validateUploadedFile({
      filename: "resume.pdf",
      declaredMimeType: "application/pdf",
      buffer: PDF_BYTES,
    });
    expect(result.kind).toBe("pdf");
  });

  it("accepts a valid DOCX (zip signature) with matching extension", () => {
    const result = validateUploadedFile({
      filename: "resume.docx",
      declaredMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: DOCX_BYTES,
    });
    expect(result.kind).toBe("docx");
  });

  it("accepts plain text files", () => {
    const result = validateUploadedFile({
      filename: "resume.txt",
      declaredMimeType: "text/plain",
      buffer: TXT_BYTES,
    });
    expect(result.kind).toBe("txt");
  });

  it("rejects an empty file", () => {
    expect(() =>
      validateUploadedFile({ filename: "resume.pdf", declaredMimeType: "application/pdf", buffer: Buffer.alloc(0) }),
    ).toThrow(ValidationError);
  });

  it("rejects a file over the size limit", () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(MAX_FILE_SIZE_BYTES, "a")]);
    expect(() =>
      validateUploadedFile({ filename: "resume.pdf", declaredMimeType: "application/pdf", buffer: big }),
    ).toThrow(ValidationError);
  });

  it("rejects a file whose real content doesn't match any supported type", () => {
    const binaryGarbage = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x00, 0x10]);
    expect(() =>
      validateUploadedFile({ filename: "resume.pdf", declaredMimeType: "application/pdf", buffer: binaryGarbage }),
    ).toThrow(ValidationError);
  });

  it("rejects a PDF renamed with a mismatched extension", () => {
    expect(() =>
      validateUploadedFile({ filename: "resume.docx", declaredMimeType: "application/pdf", buffer: PDF_BYTES }),
    ).toThrow(ValidationError);
  });

  it("rejects a declared type that actively disagrees with sniffed content", () => {
    // Real PDF bytes, but the browser claims it's a DOCX, and the filename says .pdf
    // (a mismatch between declared MIME and sniffed content for a *known* other type).
    expect(() =>
      validateUploadedFile({
        filename: "resume.pdf",
        declaredMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: PDF_BYTES,
      }),
    ).toThrow(ValidationError);
  });
});

describe("sanitizeFilename", () => {
  it("strips directory components", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\me\\resume.pdf")).toBe("resume.pdf");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("my résumé (final)!!.pdf")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("falls back to a default name when nothing safe remains", () => {
    expect(sanitizeFilename("***")).toBe("resume");
  });
});

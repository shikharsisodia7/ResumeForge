import mammoth from "mammoth";
import { PasswordException, PDFParse } from "pdf-parse";
import { ValidationError } from "@/lib/errors";
import type { ResumeFileKind } from "@/lib/files/constants";

/**
 * Collapses excess whitespace while preserving paragraph breaks and bullet
 * structure, so downstream AI parsing still sees the resume's shape.
 */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new ValidationError("This PDF is password-protected. Please upload an unlocked file");
    }
    throw new ValidationError("Could not read this PDF. It may be corrupted");
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("password") || message.includes("encrypt")) {
      throw new ValidationError("This document is password-protected. Please upload an unlocked file");
    }
    throw new ValidationError("Could not read this DOCX file. It may be corrupted");
  }
}

export async function extractResumeText(buffer: Buffer, kind: ResumeFileKind): Promise<string> {
  let raw: string;
  if (kind === "pdf") {
    raw = await extractPdfText(buffer);
  } else if (kind === "docx") {
    raw = await extractDocxText(buffer);
  } else {
    raw = buffer.toString("utf8");
  }

  const normalized = normalizeExtractedText(raw);
  if (normalized.length < 20) {
    throw new ValidationError(
      "Couldn't find readable text in this file. Please upload a resume with selectable text",
    );
  }
  return normalized;
}

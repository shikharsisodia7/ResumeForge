import { ValidationError } from "@/lib/errors";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, type ResumeFileKind } from "@/lib/files/constants";

const PDF_MAGIC = Buffer.from("%PDF-", "utf8");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // DOCX is a zip (OOXML) container

/**
 * Determines the real file type from its bytes rather than trusting the
 * client-supplied extension or MIME type, which are easy to spoof.
 */
function sniffFileKind(buffer: Buffer): ResumeFileKind | null {
  if (buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) return "pdf";
  if (buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) return "docx";
  // No reliable magic number for plain text — accept if it looks like text:
  // valid UTF-8, no NUL bytes, and not dominated by other control characters.
  if (looksLikePlainText(buffer)) return "txt";
  return null;
}

function looksLikePlainText(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let controlBytes = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    const isPrintable = byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte !== 0x7f);
    if (!isPrintable) controlBytes += 1;
  }
  return controlBytes / sample.length < 0.05;
}

export function sanitizeFilename(rawName: string): string {
  const base = rawName.split(/[/\\]/).pop() ?? "resume";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  const meaningful = cleaned.replace(/[._-]/g, "");
  return meaningful.length === 0 ? "resume" : cleaned.slice(-180);
}

export interface ValidatedFile {
  kind: ResumeFileKind;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export function validateUploadedFile(params: {
  filename: string;
  declaredMimeType: string;
  buffer: Buffer;
}): ValidatedFile {
  const { filename, declaredMimeType, buffer } = params;

  if (buffer.length === 0) {
    throw new ValidationError("The uploaded file is empty");
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `File is too large. The maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
    );
  }

  const extension = (filename.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? "").toLowerCase();
  const sniffedKind = sniffFileKind(buffer);

  if (!sniffedKind) {
    throw new ValidationError(
      "Unsupported file type. Please upload a PDF, DOCX, or plain-text resume",
    );
  }

  const expectedExtension = sniffedKind === "docx" ? ".docx" : sniffedKind === "pdf" ? ".pdf" : ".txt";
  if (sniffedKind === "docx" && extension !== ".docx") {
    throw new ValidationError(
      "The file's contents don't match its extension. Please upload a valid .docx file",
    );
  }
  if (sniffedKind === "pdf" && extension !== ".pdf") {
    throw new ValidationError(
      "The file's contents don't match its extension. Please upload a valid .pdf file",
    );
  }
  if (sniffedKind === "txt" && extension && extension !== ".txt") {
    // A .txt-looking payload with an unrelated extension is still suspicious.
    throw new ValidationError("The file's contents don't match its extension");
  }

  if (!ALLOWED_MIME_TYPES[sniffedKind].includes(declaredMimeType) && declaredMimeType !== "") {
    // The browser-reported MIME type disagrees with the sniffed content type.
    // We trust the sniffed type but reject when the declared type is actively
    // wrong for a *different* known format (e.g. an image mislabeled as PDF).
    const declaredKind = Object.entries(ALLOWED_MIME_TYPES).find(([, mimes]) =>
      mimes.includes(declaredMimeType),
    )?.[0];
    if (declaredKind && declaredKind !== sniffedKind) {
      throw new ValidationError("The file's declared type doesn't match its actual contents");
    }
  }

  return {
    kind: sniffedKind,
    filename: sanitizeFilename(filename) || `resume${expectedExtension}`,
    mimeType: ALLOWED_MIME_TYPES[sniffedKind][0],
    buffer,
  };
}

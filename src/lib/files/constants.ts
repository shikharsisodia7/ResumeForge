export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ResumeFileKind = "pdf" | "docx" | "txt";

export const ALLOWED_EXTENSIONS: Record<ResumeFileKind, string> = {
  pdf: ".pdf",
  docx: ".docx",
  txt: ".txt",
};

export const ALLOWED_MIME_TYPES: Record<ResumeFileKind, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
};

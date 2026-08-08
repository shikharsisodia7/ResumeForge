import type {
  GalleryPromptItem,
  PromptItem,
  ResumeSummary,
  VersionDetail,
  VersionPromptItem,
  VersionSummary,
} from "@/lib/client/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error ?? "Request failed", res.status);
  }
  return res.json() as Promise<T>;
}

function json(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
}

// --- Resumes ---

export const listResumes = () => apiFetch<{ resumes: ResumeSummary[] }>("/api/resumes");

export const getResume = (resumeId: string) =>
  apiFetch<{
    resume: { id: string; title: string; originalFilename: string; isProcessing: boolean };
    versions: VersionSummary[];
  }>(`/api/resumes/${resumeId}`);

export const deleteResume = (resumeId: string) =>
  apiFetch<{ deleted: true }>(`/api/resumes/${resumeId}`, { method: "DELETE" });

export const uploadResume = (formData: FormData) =>
  apiFetch<{ resume: { id: string; title: string }; version: { id: string; name: string } }>(
    "/api/resumes/upload",
    { method: "POST", body: formData },
  );

export const formatResume = (resumeId: string) =>
  apiFetch<{ version: VersionSummary }>(`/api/resumes/${resumeId}/format`, { method: "POST" });

export const createVersion = (
  resumeId: string,
  body: { sourceVersionId: string; name: string; targetCompany?: string; targetRole?: string; jobDescription?: string },
) => apiFetch<{ version: VersionSummary }>(`/api/resumes/${resumeId}/versions`, json(body));

// --- Versions ---

export const getVersion = (versionId: string) =>
  apiFetch<{ version: VersionDetail; activePrompts: VersionPromptItem[] }>(`/api/versions/${versionId}`);

export const updateVersion = (
  versionId: string,
  body: Partial<{ name: string; targetCompany: string | null; targetRole: string | null; jobDescription: string | null }>,
) => apiFetch<{ version: VersionDetail }>(`/api/versions/${versionId}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteVersion = (versionId: string) =>
  apiFetch<{ deleted: true }>(`/api/versions/${versionId}`, { method: "DELETE" });

export const customizeVersion = (versionId: string, body: { instruction: string } | { promptId: string }) =>
  apiFetch<{ rejected: boolean; explanation: string; version: VersionDetail }>(
    `/api/versions/${versionId}/customize`,
    json(body),
  );

export const resetVersion = (versionId: string) =>
  apiFetch<{ version: VersionDetail }>(`/api/versions/${versionId}/reset`, { method: "POST" });

export const undoVersion = (versionId: string) =>
  apiFetch<{ version: VersionDetail }>(`/api/versions/${versionId}/undo`, { method: "POST" });

export const pdfDownloadUrl = (versionId: string) => `/api/versions/${versionId}/pdf`;

export const getPdfPageCount = (versionId: string) =>
  apiFetch<{ pageCount: number }>(`/api/versions/${versionId}/pdf/page-count`);

// --- Version prompts ---

export const listVersionPrompts = (versionId: string) =>
  apiFetch<{ versionPrompts: VersionPromptItem[] }>(`/api/versions/${versionId}/prompts`);

export const reorderVersionPrompts = (versionId: string, order: string[]) =>
  apiFetch<{ versionPrompts: VersionPromptItem[] }>(`/api/versions/${versionId}/prompts`, {
    method: "PATCH",
    body: JSON.stringify({ order }),
  });

export const toggleVersionPrompt = (versionId: string, versionPromptId: string, isActive: boolean) =>
  apiFetch<{ versionPrompt: VersionPromptItem }>(`/api/versions/${versionId}/prompts/${versionPromptId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });

// --- Prompt library ---

export const listPrompts = () => apiFetch<{ prompts: PromptItem[] }>("/api/prompts");

export const createPrompt = (body: { text: string; description?: string; isShared?: boolean }) =>
  apiFetch<{ prompt: PromptItem }>("/api/prompts", json(body));

export const updatePrompt = (
  promptId: string,
  body: Partial<{ text: string; description: string | null; isShared: boolean }>,
) => apiFetch<{ prompt: PromptItem }>(`/api/prompts/${promptId}`, { method: "PATCH", body: JSON.stringify(body) });

export const deletePrompt = (promptId: string) =>
  apiFetch<{ deleted: true }>(`/api/prompts/${promptId}`, { method: "DELETE" });

// --- Gallery ---

export const listGalleryPrompts = (params: { q?: string; cursor?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiFetch<{ prompts: GalleryPromptItem[]; nextCursor: string | null }>(
    `/api/gallery/prompts${qs ? `?${qs}` : ""}`,
  );
};

export const copyGalleryPrompt = (promptId: string) =>
  apiFetch<{ prompt: PromptItem; alreadyCopied: boolean }>(`/api/gallery/prompts/${promptId}/copy`, {
    method: "POST",
  });

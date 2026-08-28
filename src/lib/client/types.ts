import type { ResumeContent } from "@/lib/schemas/resume-content";
import type { ResumeStyle } from "@/lib/schemas/resume-style";

export interface ResumeSummary {
  id: string;
  title: string;
  originalFilename: string;
  createdAt: string;
  updatedAt: string;
  isProcessing: boolean;
  _count: { versions: number };
}

export interface VersionSummary {
  id: string;
  name: string;
  targetCompany: string | null;
  targetRole: string | null;
  parentVersionId: string | null;
  revision: number;
  isProcessing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VersionDetail {
  id: string;
  resumeId: string;
  resumeTitle: string;
  name: string;
  targetCompany: string | null;
  targetRole: string | null;
  jobDescription: string | null;
  parentVersionId: string | null;
  contentJson: ResumeContent;
  styleJson: ResumeStyle;
  revision: number;
  canUndo: boolean;
  isProcessing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptRef {
  id: string;
  text: string;
  description: string | null;
  isShared: boolean;
}

export interface VersionPromptItem {
  id: string;
  versionId: string;
  promptId: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  prompt: PromptRef;
}

export interface PromptItem {
  id: string;
  creatorId: string;
  text: string;
  description: string | null;
  isShared: boolean;
  copiedFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPromptItem {
  id: string;
  text: string;
  description: string | null;
  createdAt: string;
  creatorDisplayName: string;
}

export type ChecklistCategory =
  | "grammar" | "typos" | "formatting" | "margins" | "fonts"
  | "dates" | "page_count" | "hallucinations" | "missing_facts" | "pdf_safety";

export interface ChecklistItemView {
  id: string;
  category: ChecklistCategory;
  label: string;
  status: "passed" | "warning" | "failed";
  detail: string;
}

export interface ChecklistRunView {
  id: string;
  versionId: string;
  overallStatus: "passed" | "warning" | "failed";
  resultsJson: ChecklistItemView[];
  createdAt: string;
}

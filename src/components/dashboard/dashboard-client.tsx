"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DuplicateVersionDialog } from "@/components/dashboard/duplicate-version-dialog";
import { ApiError, deleteResume, deleteVersion, formatResume } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";

interface DashboardVersion {
  id: string;
  name: string;
  targetCompany: string | null;
  targetRole: string | null;
  parentVersionId: string | null;
  revision: number;
  isProcessing: boolean;
  createdAt: string;
}

interface DashboardResume {
  id: string;
  title: string;
  originalFilename: string;
  createdAt: string;
  isProcessing: boolean;
  versions: DashboardVersion[];
}

export function DashboardClient({ initialResumes }: { initialResumes: DashboardResume[] }) {
  const router = useRouter();
  const [pendingDeleteResume, setPendingDeleteResume] = useState<DashboardResume | null>(null);
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<{ resumeId: string; version: DashboardVersion } | null>(
    null,
  );
  const [duplicateTarget, setDuplicateTarget] = useState<{ resumeId: string; version: DashboardVersion } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDeleteResume() {
    if (!pendingDeleteResume) return;
    setBusyId(pendingDeleteResume.id);
    try {
      await deleteResume(pendingDeleteResume.id);
      toast.success("Resume deleted");
      setPendingDeleteResume(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete this resume");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteVersion() {
    if (!pendingDeleteVersion) return;
    setBusyId(pendingDeleteVersion.version.id);
    try {
      await deleteVersion(pendingDeleteVersion.version.id);
      toast.success("Version deleted");
      setPendingDeleteVersion(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete this version");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFormat(resumeId: string) {
    setBusyId(resumeId);
    try {
      const { version } = await formatResume(resumeId);
      toast.success("Formatted");
      router.push(`/editor/${version.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't format this resume");
    } finally {
      setBusyId(null);
    }
  }

  if (initialResumes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-8" aria-hidden="true" />}
        title="No resumes yet"
        description="Upload a PDF, DOCX, or TXT resume to get an AI-organized, ATS-friendly first draft in seconds."
        action={
          <Link href="/upload" className={buttonClassName()}>
            <Plus className="size-4" aria-hidden="true" />
            Upload a resume
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link href="/upload" className={buttonClassName()}>
          <Plus className="size-4" aria-hidden="true" />
          Upload a resume
        </Link>
      </div>

      <div className="space-y-5">
        {initialResumes.map((resume) => (
          <Card key={resume.id}>
            <CardHeader>
              <div>
                <h2 className="font-medium">{resume.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {resume.originalFilename} · uploaded {formatDate(resume.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingDeleteResume(resume)}
                aria-label={`Delete ${resume.title}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              {resume.versions.length === 0 ? (
                <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {resume.isProcessing ? "Formatting in progress…" : "No formatted version yet"}
                  </span>
                  {!resume.isProcessing && (
                    <Button size="sm" variant="secondary" onClick={() => handleFormat(resume.id)} disabled={busyId === resume.id}>
                      Format now
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {resume.versions.map((version) => (
                    <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/editor/${version.id}`} className="text-sm font-medium hover:text-accent">
                            {version.name}
                          </Link>
                          {version.targetCompany || version.targetRole ? (
                            <Badge variant="accent">
                              {[version.targetRole, version.targetCompany].filter(Boolean).join(" @ ")}
                            </Badge>
                          ) : null}
                          {version.isProcessing && <Badge variant="neutral">Processing…</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Revision {version.revision} · {formatDate(version.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDuplicateTarget({ resumeId: resume.id, version })}
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteVersion({ resumeId: resume.id, version })}
                          aria-label={`Delete ${version.name}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteResume !== null}
        title="Delete this resume?"
        description={`This permanently deletes "${pendingDeleteResume?.title}" and all of its versions. This can't be undone.`}
        confirmLabel="Delete resume"
        danger
        pending={busyId === pendingDeleteResume?.id}
        onConfirm={handleDeleteResume}
        onCancel={() => setPendingDeleteResume(null)}
      />

      <ConfirmDialog
        open={pendingDeleteVersion !== null}
        title="Delete this version?"
        description={`This permanently deletes "${pendingDeleteVersion?.version.name}". The original resume and its other versions are unaffected.`}
        confirmLabel="Delete version"
        danger
        pending={busyId === pendingDeleteVersion?.version.id}
        onConfirm={handleDeleteVersion}
        onCancel={() => setPendingDeleteVersion(null)}
      />

      {duplicateTarget && (
        <DuplicateVersionDialog
          open={duplicateTarget !== null}
          resumeId={duplicateTarget.resumeId}
          sourceVersionId={duplicateTarget.version.id}
          sourceVersionName={duplicateTarget.version.name}
          onClose={() => setDuplicateTarget(null)}
        />
      )}
    </div>
  );
}

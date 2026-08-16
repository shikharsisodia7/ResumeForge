"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Copy, Download, RotateCcw, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DuplicateVersionDialog } from "@/components/dashboard/duplicate-version-dialog";
import { ApiError, pdfDownloadUrl, resetVersion, undoVersion, updateVersion } from "@/lib/client/api";
import type { VersionDetail } from "@/lib/client/types";

export function VersionHeader({
  version,
  onChange,
}: {
  version: VersionDetail;
  onChange: (version: VersionDetail) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(version.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function commitName() {
    setEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === version.name) {
      setName(version.name);
      return;
    }
    try {
      const { version: updated } = await updateVersion(version.id, { name: trimmed });
      onChange(updated);
    } catch (error) {
      setName(version.name);
      toast.error(error instanceof ApiError ? error.message : "Couldn't rename this version");
    }
  }

  async function handleUndo() {
    setBusy(true);
    try {
      const { version: updated } = await undoVersion(version.id);
      toast.success("Undone");
      onChange(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't undo");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      const { version: updated } = await resetVersion(version.id);
      toast.success("Reset to the original AI-formatted version");
      onChange(updated);
      setConfirmReset(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't reset this version");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <Link
        href={`/dashboard`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {version.resumeTitle}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {editingName ? (
            <Input
              autoFocus
              aria-label="Version name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setName(version.name);
                  setEditingName(false);
                }
              }}
              className="h-9 w-64 text-lg font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="rounded-md px-1 text-xl font-semibold tracking-tight hover:bg-muted"
            >
              {version.name}
            </button>
          )}
          {(version.targetCompany || version.targetRole) && (
            <Badge variant="accent">{[version.targetRole, version.targetCompany].filter(Boolean).join(" @ ")}</Badge>
          )}
          <Badge variant="neutral">Rev {version.revision}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleUndo} disabled={!version.canUndo || busy}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            Undo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)} disabled={busy}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDuplicateOpen(true)}>
            <Copy className="size-3.5" aria-hidden="true" />
            Duplicate
          </Button>
          <a href={pdfDownloadUrl(version.id)} download className={buttonClassName("primary", "sm")}>
            <Download className="size-3.5" aria-hidden="true" />
            Download PDF
          </a>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to original AI-formatted version?"
        description="This discards your current customizations for this version. Saved prompts stay in your library and can be reapplied."
        confirmLabel="Reset"
        danger
        pending={busy}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />

      {duplicateOpen && (
        <DuplicateVersionDialog
          open={duplicateOpen}
          resumeId={version.resumeId}
          sourceVersionId={version.id}
          sourceVersionName={version.name}
          onClose={() => setDuplicateOpen(false)}
        />
      )}
    </div>
  );
}

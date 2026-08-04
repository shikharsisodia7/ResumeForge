"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ApiError, createVersion } from "@/lib/client/api";

export function DuplicateVersionDialog({
  open,
  resumeId,
  sourceVersionId,
  sourceVersionName,
  onClose,
}: {
  open: boolean;
  resumeId: string;
  sourceVersionId: string;
  sourceVersionName: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(`${sourceVersionName} copy`);
      setTargetCompany("");
      setTargetRole("");
      setJobDescription("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, sourceVersionName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for the new version");
      return;
    }
    setPending(true);
    try {
      const { version } = await createVersion(resumeId, {
        sourceVersionId,
        name: name.trim(),
        targetCompany: targetCompany.trim() || undefined,
        targetRole: targetRole.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
      });
      toast.success(jobDescription.trim() ? "Tailored version created" : "Version duplicated");
      onClose();
      router.push(`/editor/${version.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create the version");
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="p-5">
        <h2 className="text-base font-semibold">New version</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Duplicated from &ldquo;{sourceVersionName}&rdquo;. Add a job description to tailor it truthfully.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="version-name">Version name</Label>
            <Input id="version-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="target-company">Target company (optional)</Label>
              <Input id="target-company" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="target-role">Target role (optional)</Label>
              <Input id="target-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="job-description">Job description (optional — runs AI tailoring)</Label>
            <Textarea
              id="job-description"
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting to truthfully emphasize matching experience..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : jobDescription.trim() ? "Tailor & create" : "Create version"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

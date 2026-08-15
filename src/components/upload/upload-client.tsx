"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/client/api";
import { uploadAndFinalizeResume } from "@/lib/client/upload-resume";
import { cn } from "@/lib/utils";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

const ACCEPTED = ".pdf,.docx,.txt";

export function UploadClient({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function pickFile(selected: File | null) {
    setFile(selected);
    setError(null);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.(pdf|docx|txt)$/i, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a resume file");
      return;
    }
    if (!title.trim()) {
      setError("Please give this resume a title");
      return;
    }

    setError(null);
    setStage("uploading");
    setProgress(0);

    try {
      const result = await uploadAndFinalizeResume({
        file,
        title: title.trim(),
        userId,
        onProgress: (percent) => {
          setProgress(percent);
          if (percent >= 100) setStage("processing");
        },
      });
      setStage("done");
      router.push(`/editor/${result.version.id}`);
      router.refresh();
    } catch (err) {
      setStage("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const busy = stage === "uploading" || stage === "processing" || stage === "done";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragActive ? "border-accent bg-accent-muted" : "border-border",
              busy && "pointer-events-none opacity-60",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm">
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <button
                    type="button"
                    className="font-medium text-accent hover:underline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose a file
                  </button>{" "}
                  or drag it here
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, or TXT — up to 10 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </div>

          <div>
            <Label htmlFor="resume-title">Resume title</Label>
            <Input
              id="resume-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineer Resume"
              disabled={busy}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          {stage !== "idle" && stage !== "error" && (
            <div className="space-y-2">
              <ProgressRow
                label="Uploading"
                state={stage === "uploading" ? "active" : "done"}
                percent={stage === "uploading" ? progress : 100}
              />
              <ProgressRow
                label="Extracting text, organizing with AI, and saving"
                state={stage === "processing" ? "active" : stage === "done" ? "done" : "pending"}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {stage === "uploading" ? "Uploading…" : "Processing…"}
              </>
            ) : (
              <>
                <FileUp className="size-4" aria-hidden="true" />
                Upload and format
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProgressRow({
  label,
  state,
  percent,
}: {
  label: string;
  state: "pending" | "active" | "done";
  percent?: number;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex size-5 items-center justify-center">
        {state === "done" && <CheckCircle2 className="size-4 text-success" aria-hidden="true" />}
        {state === "active" && <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" />}
        {state === "pending" && <div className="size-1.5 rounded-full bg-border" />}
      </div>
      <span className={state === "pending" ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      {typeof percent === "number" && state === "active" && (
        <span className="ml-auto text-xs text-muted-foreground">{percent}%</span>
      )}
    </div>
  );
}

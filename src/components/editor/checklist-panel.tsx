"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CHECKLIST_CATEGORIES } from "@/lib/checklist/definitions";
import { ApiError, getLatestChecklist, runChecklist } from "@/lib/client/api";
import type { ChecklistItemView } from "@/lib/client/types";
import { cn } from "@/lib/utils";

type DisplayStatus = "pending" | "checking" | "passed" | "warning" | "failed";
interface DisplayItem extends ChecklistItemView {
  displayStatus: DisplayStatus;
}

const REVEAL_STEP_MS = 90;

function StatusIcon({ status }: { status: DisplayStatus }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    case "warning":
      return <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
    case "failed":
      return <XCircle className="size-4 text-danger" aria-hidden="true" />;
    case "checking":
      return <Spinner className="text-muted-foreground" />;
    default:
      return <span className="block size-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />;
  }
}

function statusLabel(status: DisplayStatus): string {
  return { pending: "Not checked yet", checking: "Checking", passed: "Passed", warning: "Warning", failed: "Failed" }[status];
}

export function ChecklistPanel({ versionId, revision }: { versionId: string; revision: number }) {
  const [items, setItems] = useState<DisplayItem[] | null>(null);
  const [overallStatus, setOverallStatus] = useState<"passed" | "warning" | "failed" | null>(null);
  const [running, setRunning] = useState(false);

  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  async function stageReveal(finalItems: ChecklistItemView[]) {
    setItems(finalItems.map((item) => ({ ...item, displayStatus: "pending" })));
    if (prefersReducedMotion) {
      setItems(finalItems.map((item) => ({ ...item, displayStatus: item.status })));
      return;
    }
    for (let i = 0; i < finalItems.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, REVEAL_STEP_MS));
      setItems((prev) =>
        prev?.map((item, idx) => (idx === i ? { ...item, displayStatus: "checking" } : item)) ?? null,
      );
      await new Promise((resolve) => setTimeout(resolve, REVEAL_STEP_MS));
      setItems((prev) =>
        prev?.map((item, idx) => (idx === i ? { ...item, displayStatus: finalItems[idx].status } : item)) ?? null,
      );
    }
  }

  async function handleRun() {
    setRunning(true);
    try {
      const { run } = await runChecklist(versionId);
      setOverallStatus(run.overallStatus);
      await stageReveal(run.resultsJson);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't run the resume check");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getLatestChecklist(versionId)
      .then(({ run }) => {
        if (cancelled || !run) return;
        setOverallStatus(run.overallStatus);
        setItems(run.resultsJson.map((item) => ({ ...item, displayStatus: item.status })));
      })
      .catch(() => {
        // Non-fatal — the "Run resume check" button still works.
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch (and let the user re-run) whenever the version's content actually changes.
  }, [versionId, revision]);

  const summary = useMemo(() => {
    if (!items) return null;
    const failed = items.filter((i) => i.status === "failed").length;
    const warnings = items.filter((i) => i.status === "warning").length;
    if (failed === 0 && warnings === 0) return "All checks passed.";
    const parts = [];
    if (failed > 0) parts.push(`${failed} failed`);
    if (warnings > 0) parts.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
    return `Resume check complete: ${parts.join(", ")}.`;
  }, [items]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Resume check</h3>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
        >
          {running ? <Spinner /> : null}
          {items ? "Re-check resume" : "Run resume check"}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {running ? "Checking your resume…" : summary ?? ""}
      </p>

      {overallStatus && !running && (
        <Badge variant={overallStatus === "passed" ? "success" : overallStatus === "warning" ? "warning" : "danger"} className="mb-3">
          {summary}
        </Badge>
      )}

      {!items && !running && (
        <p className="text-sm text-muted-foreground">Run a check to see grammar, formatting, margins, dates, and fact-accuracy results.</p>
      )}

      {items && (
        <ul className="space-y-1.5">
          {CHECKLIST_CATEGORIES.map((category) => {
            const categoryItems = items.filter((i) => i.category === category.key);
            if (categoryItems.length === 0) return null;
            const worst = categoryItems.some((i) => i.displayStatus === "failed")
              ? "failed"
              : categoryItems.some((i) => i.displayStatus === "warning")
                ? "warning"
                : categoryItems.every((i) => i.displayStatus === "passed")
                  ? "passed"
                  : "checking";
            return (
              <li key={category.key} role="listitem">
                <details className="group rounded-md border border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <StatusIcon status={worst} />
                      {category.label}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {categoryItems.filter((i) => i.displayStatus === "passed").length}/{categoryItems.length} passed
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <ul className="space-y-1 border-t border-border px-3 py-2">
                    {categoryItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 py-1 text-sm">
                        <span className="mt-0.5">
                          <StatusIcon status={item.displayStatus} />
                        </span>
                        <span>
                          <span className="sr-only">{statusLabel(item.displayStatus)}: </span>
                          <span className="font-medium">{item.label}</span>
                          {(item.displayStatus === "warning" || item.displayStatus === "failed") && (
                            <span className={cn("block text-xs", item.displayStatus === "failed" ? "text-danger" : "text-amber-700 dark:text-amber-400")}>
                              {item.detail}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

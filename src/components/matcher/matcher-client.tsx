"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchReportData } from "@/lib/types";
import { MatchReportVisual } from "@/components/matcher/match-report";

export function MatcherClient({
  versions,
  jobs,
}: {
  versions: { id: string; versionName: string; resume: { name: string } }[];
  jobs: { id: string; title: string; company: string }[];
}) {
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<MatchReportData | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: versionId, jobDescriptionId: jobId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Match failed");
      setReport(j.report as MatchReportData);
      toast.success("Match refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Resume version
            <select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" value={versionId} onChange={(e) => setVersionId(e.target.value)}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.resume.name} · {v.versionName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Job posting
            <select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} · {j.title}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="button" disabled={busy || !versionId || !jobId} onClick={() => void run()}>
              Run matcher
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Side-by-side requirements</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-zinc-500">Job asks for</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {report.requirements.slice(0, 12).map((r) => (
                    <li key={r.requirement}>{r.requirement}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase text-zinc-500">Resume evidence</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {report.requirements.slice(0, 12).map((r) => (
                    <li key={`${r.requirement}-ev`}>
                      {r.evidence.length
                        ? r.evidence.map((e) => `${e.type}: ${e.label}`).join(" · ")
                        : "No direct evidence yet"}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <MatchReportVisual report={report} />
        </div>
      )}
    </div>
  );
}

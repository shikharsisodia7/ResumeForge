"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ATSReport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui";

export function AtsScannerClient({
  versions,
  jobs,
}: {
  versions: { id: string; versionName: string; resume: { name: string } }[];
  jobs: { id: string; title: string; company: string }[];
}) {
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const [jobId, setJobId] = useState<string | "">("");
  const [report, setReport] = useState<ATSReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!versionId && versions[0]) setVersionId(versions[0].id);
  }, [versionId, versions]);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/ats-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: versionId, jobDescriptionId: jobId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setReport(data.ats as ATSReport);
      toast.success("ATS scan recorded");
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
          <CardTitle>Scan configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Version
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.resume.name} · {v.versionName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Optional JD for keyword-aware scan
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Baseline scan</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} · {j.title}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="button" disabled={busy || !versionId} onClick={() => void run()}>
              Run scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Latest report ({report.totalScore}/100)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {[
              { label: "Formatting", value: report.formattingScore },
              { label: "Skills", value: report.skillsScore },
              { label: "Bullets", value: report.bulletScore },
              { label: "Keyword", value: report.keywordScore },
              { label: "Sections", value: report.sectionScore },
              { label: "Length", value: report.lengthScore },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{p.label}</span>
                  <span>{p.value}</span>
                </div>
                <ProgressBar value={p.value} />
              </div>
            ))}
            <div className="lg:col-span-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium">Warnings</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {report.warnings.map((w, i) => (
                    <li key={i}>
                      [{w.priority}] {w.message}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Fixes</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {report.fixes.map((f, i) => (
                    <li key={i}>
                      [{f.priority}] {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

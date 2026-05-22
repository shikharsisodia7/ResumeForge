"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { MatchReportData, TailoringResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEP_TITLES = [
  "Select job posting",
  "Select resume version",
  "Target snapshot",
  "Keyword landscape",
  "Baseline matcher",
  "Tailoring playbook",
  "Bullet focus",
  "Projects & roles",
  "Skills emphasis",
  "Length & pacing",
  "Finalize tailoring preview",
  "Launch checklist",
] as const;

type JobMini = { id: string; title: string; company: string };
type VersionMini = { id: string; versionName: string; resume: { name: string } };

export function TailorWizard({ jobs, versions }: { jobs: JobMini[]; versions: VersionMini[] }) {
  const [step, setStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(jobs[0]?.id ?? null);
  const [versionId, setVersionId] = useState<string | null>(versions[0]?.id ?? null);

  const [baseline, setBaseline] = useState<MatchReportData | null>(null);
  const [tailor, setTailor] = useState<TailoringResult | null>(null);
  const [busy, setBusy] = useState(false);

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  async function runBaseline() {
    if (!jobId || !versionId) return toast.error("Select job and version");
    setBusy(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescriptionId: jobId, resumeVersionId: versionId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "matcher failed");
      setBaseline(j.report as MatchReportData);
      toast.success("Baseline matcher complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function runTailorPreview() {
    if (!jobId || !versionId) return toast.error("Select inputs");
    setBusy(true);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescriptionId: jobId, resumeVersionId: versionId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Tailor failed");
      setTailor(j as TailoringResult);
      toast.success("Tailoring preview ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId]);
  const ver = useMemo(() => versions.find((v) => v.id === versionId), [versions, versionId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase text-zinc-500">
          Step {step + 1} / {STEP_TITLES.length}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STEP_TITLES.map((t, idx) => (
            <button
              key={t}
              type="button"
              onClick={() => setStep(idx)}
              className={`rounded-full border px-3 py-1 text-xs ${
                idx === step ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {idx + 1}. {t}
            </button>
          ))}
        </div>
        <ProgressBar value={progress} className="mt-3" />
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[0]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={jobId ?? ""}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="" disabled>
                Choose job posting
              </option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} · {j.title}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" disabled={step >= STEP_TITLES.length - 1} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[1]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={versionId ?? ""}
              onChange={(e) => setVersionId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="" disabled>
                Choose version
              </option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.resume.name} · {v.versionName}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[2]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{job?.title}</p>
            <p className="text-zinc-500">{job?.company}</p>
            <p className="text-xs text-zinc-500">
              {ver?.resume.name ?? "Pick version"} · {ver?.versionName}
            </p>
          </CardContent>
        </Card>
      )}

      {step === 3 && <KeywordsStep jobId={jobId} />}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[4]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" disabled={busy} onClick={() => void runBaseline()}>
              Run baseline matcher
            </Button>
            {baseline ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="strong">Overall {baseline.overallScore}</Badge>
                <Badge variant="partial">KW {baseline.keywordScore}</Badge>
                <Badge variant="default">Evidence {baseline.evidenceStrength}%</Badge>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No report yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {step >= 5 && step <= 9 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <GuidanceSlice step={step} baseline={baseline} tailor={tailor} />
            <Button type="button" disabled={busy} variant="outline" onClick={() => void runTailorPreview()}>
              Refresh tailoring insights
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 10 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[10]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" disabled={busy} onClick={() => void runTailorPreview()}>
              Compute tailoring preview
            </Button>
            {tailor ? (
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {tailor.recommendations.slice(0, 12).map((r, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{r.priority}</span> · {r.label}: {r.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Run tailoring to see prioritized actions.</p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 11 && (
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[11]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>Open the ATS scanner once edits land.</li>
              <li>Mirror proof from master profile — never invent skills.</li>
              <li>Save a tailored version from the Resume Builder selections.</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/ats-scanner" className="text-indigo-600 hover:underline">
                ATS scanner
              </Link>
              <Link href={`/resume-builder?version=${versionId ?? ""}`} className="text-indigo-600 hover:underline">
                Resume builder
              </Link>
              <Link href="/matcher" className="text-indigo-600 hover:underline">
                Deep matcher
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        <Button type="button" variant="outline" disabled={step === STEP_TITLES.length - 1} onClick={() => setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1))}>
          Next step
        </Button>
      </div>
    </div>
  );
}

function KeywordsStep({ jobId }: { jobId: string | null }) {
  const [kw, setKw] = useState<{ term: string; category: string; importance: number }[]>([]);
  async function load() {
    if (!jobId) return;
    const res = await fetch(`/api/job-descriptions/${jobId}`);
    const data = await res.json();
    setKw(data.keywords?.slice?.(0, 40) ?? []);
    toast.message("Keywords loaded");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{STEP_TITLES[3]}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Load keywords
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {kw.map((k) => (
          <Badge key={`${k.term}-${k.category}`} variant={k.importance >= 70 ? "strong" : k.importance >= 45 ? "partial" : "default"}>
            {k.term} <span className="opacity-70">({k.category})</span>
          </Badge>
        ))}
        {kw.length === 0 && <p className="text-sm text-zinc-500">Load keywords once a posting is saved.</p>}
      </CardContent>
    </Card>
  );
}

function GuidanceSlice({
  step,
  baseline,
  tailor,
}: {
  step: number;
  baseline: MatchReportData | null;
  tailor: TailoringResult | null;
}) {
  if (step === 5) {
    return (
      <div className="space-y-2">
        <p>
          Confidence after baseline scoring:{" "}
          <span className="font-semibold">{baseline?.tailoringConfidence ?? tailor?.report.tailoringConfidence ?? "Run matcher"}%</span>
        </p>
        <p>Use the prioritized recommendations queue for what to reorder or amplify next.</p>
      </div>
    );
  }
  if (step === 6) {
    const adds = tailor?.report.recommendedBulletsAdd.slice(0, 3) ?? [];
    return (
      <div>
        <p className="mb-2">Suggested bullets:</p>
        <ul className="list-disc space-y-1 pl-5">
          {adds.length ? adds.map((b) => <li key={b.id}>{b.text}</li>) : <li>Generate tailoring preview for suggestions.</li>}
        </ul>
      </div>
    );
  }
  if (step === 7) {
    const projs = tailor?.report.recommendedProjects.slice(0, 3) ?? [];
    const exps = tailor?.report.recommendedExperiences.slice(0, 3) ?? [];
    return (
      <div className="space-y-2">
        <p className="font-medium">Projects to foreground</p>
        <ul className="list-disc pl-5">
          {projs.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
        <p className="font-medium">Experience alignments</p>
        <ul className="list-disc pl-5">
          {exps.map((e) => (
            <li key={e.id}>{e.title}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 8) {
    const skills = tailor?.report.recommendedSkillsMove.slice(0, 12) ?? [];
    return (
      <div className="space-y-2">
        <p>Move proof-backed skills closer to roles that reference them:</p>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      </div>
    );
  }
  if (step === 9) {
    return (
      <p>
        Keep one-page mode on for campus roles unless the JD explicitly rewards depth. ATS format score from matcher:{" "}
        <span className="font-semibold">{baseline?.atsFormatScore ?? "pending"}%</span>.
      </p>
    );
  }
  return null;
}

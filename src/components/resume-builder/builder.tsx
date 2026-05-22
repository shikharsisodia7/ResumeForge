"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ResumePreview } from "@/components/resume-builder/preview";
import type { ResumeContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RESUME_TEMPLATES } from "@/lib/constants";

type BuilderPayload = {
  version: {
    id: string;
    versionName: string;
    tailoringConfidence: number;
    jobMatchScore: number;
    atsScore: number;
    selectedBullets?: string | null;
  };
  resume: {
    template: string;
    font: string;
    spacing: string;
    margins: string;
    onePageMode: boolean;
  };
  content: ResumeContent | null;
  jdOptions: { id: string; title: string; company: string }[];
  totals: { bullets: number; skills: number; projects: number; experiences: number };
};

export function ResumeBuilderClient({ versionId }: { versionId: string }) {
  const [data, setData] = useState<BuilderPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resume-builder?versionId=${encodeURIComponent(versionId)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to load builder");
      setData(j);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveResumePatch(patch: Record<string, unknown>) {
    const res = await fetch("/api/resume-builder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId, ...patch }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Save failed");
      return;
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            resume: j.resume ?? prev.resume,
            version: j.version ?? prev.version,
          }
        : prev
    );
    toast.success("Resume settings updated");
  }

  const templateOptions = useMemo(() => RESUME_TEMPLATES, []);

  if (loading || !data) {
    return <p className="text-sm text-zinc-500">Loading builder…</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Template & layout</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label className="text-sm">
              Template
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={data.resume.template}
                onChange={(e) => saveResumePatch({ template: e.target.value })}
              >
                {templateOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Font
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                  value={data.resume.font}
                  onChange={(e) => saveResumePatch({ font: e.target.value })}
                >
                  <option value="inter">Inter</option>
                  <option value="georgia">Georgia</option>
                  <option value="ibm-plex">IBM Plex Sans</option>
                </select>
              </label>
              <label className="text-sm">
                Spacing
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                  value={data.resume.spacing}
                  onChange={(e) => saveResumePatch({ spacing: e.target.value })}
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </label>
              <label className="text-sm">
                Margins
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                  value={data.resume.margins}
                  onChange={(e) => saveResumePatch({ margins: e.target.value })}
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm">
                <input
                  type="checkbox"
                  checked={data.resume.onePageMode}
                  onChange={(e) => saveResumePatch({ onePageMode: e.target.checked })}
                />
                One-page mode
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version intelligence</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-zinc-500">ATS</p>
              <Badge>{data.version.atsScore}</Badge>
              <ProgressBar value={data.version.atsScore} />
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Job match</p>
              <Badge variant="partial">{data.version.jobMatchScore}</Badge>
              <ProgressBar value={data.version.jobMatchScore} />
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Tailoring confidence</p>
              <Badge variant="strong">{data.version.tailoringConfidence}</Badge>
              <ProgressBar value={data.version.tailoringConfidence} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content coverage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge>Bullets {data.totals.bullets}</Badge>
            <Badge variant="default">Skills {data.totals.skills}</Badge>
            <Badge variant="default">Projects {data.totals.projects}</Badge>
            <Badge variant="default">Experiences {data.totals.experiences}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick QA</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                await load();
                toast.message("Preview refreshed");
              }}
            >
              Refresh data
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Live preview</p>
          <Badge variant="default">{data.version.versionName}</Badge>
        </div>
        <ResumePreview content={data.content} />
      </div>
    </div>
  );
}

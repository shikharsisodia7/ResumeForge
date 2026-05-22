"use client";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui";
import { MATCH_STATUS_LABELS } from "@/lib/constants";
import type { MatchReportData, MatchStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MatchReportVisual({ report }: { report: MatchReportData }) {
  const pillars = [
    { label: "Overall", value: report.overallScore },
    { label: "Keywords", value: report.keywordScore },
    { label: "Hard skills", value: report.hardSkillScore },
    { label: "Soft skills", value: report.softSkillScore },
    { label: "Experience", value: report.experienceScore },
    { label: "Projects", value: report.projectScore },
    { label: "Education", value: report.educationScore },
    { label: "Responsibilities", value: report.responsibilityScore },
    { label: "ATS format", value: report.atsFormatScore },
    { label: "Evidence", value: report.evidenceStrength },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <Card key={p.label}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{p.label}</span>
                <Badge variant={p.value >= 70 ? "success" : p.value >= 45 ? "warning" : "missing"}>{p.value}</Badge>
              </div>
              <ProgressBar value={p.value} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score narrative</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {report.scoreExplanation.map((line, i) => (
            <Badge key={i} variant="default">
              {line}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword badges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {report.strongKeywords.slice(0, 24).map((k) => (
            <Badge key={`s-${k}`} variant="strong">
              {k}
            </Badge>
          ))}
          {report.weakKeywords.slice(0, 16).map((k) => (
            <Badge key={`w-${k}`} variant="partial">
              {k}
            </Badge>
          ))}
          {report.missingKeywords.slice(0, 16).map((k) => (
            <Badge key={`m-${k}`} variant="missing">
              {k}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements checklist</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[480px] space-y-2 overflow-auto">
          {report.requirements.slice(0, 80).map((r, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <Badge variant={(r.status as MatchStatus) || "default"}>{MATCH_STATUS_LABELS[r.status] ?? r.status}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.requirement}</p>
                <p className="text-xs text-zinc-500">{r.category}{r.notes ? ` · ${r.notes}` : ""}</p>
                {r.evidence.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {r.evidence.slice(0, 3).map((e, j) => (
                      <li key={j}>
                        <span className="font-medium">{e.type}</span>: {e.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(report.sectionWarnings?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.sectionWarnings.map((w, i) => (
              <Badge key={i} variant="warning">
                {w}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

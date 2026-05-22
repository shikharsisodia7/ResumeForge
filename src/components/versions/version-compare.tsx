"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui";

export function VersionCompareTool({
  versions,
}: {
  versions: { id: string; versionName: string; resume: { name: string } }[];
}) {
  const [left, setLeft] = useState(versions[0]?.id ?? "");
  const [right, setRight] = useState(versions[1]?.id ?? "");
  const [result, setResult] = useState<{
    overlapScore: number;
    leftSummary: { bullets: number; skills: number; sections: number; name: string };
    rightSummary: { bullets: number; skills: number; sections: number; name: string };
    onlyLeft: string[];
    onlyRight: string[];
  } | null>(null);

  async function compare() {
    const res = await fetch("/api/version-compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leftVersionId: left, rightVersionId: right }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Compare failed");
      return;
    }
    setResult(j);
    toast.success("Diff ready");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Version A
          <select value={left} onChange={(e) => setLeft(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.resume.name} · {v.versionName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Version B
          <select value={right} onChange={(e) => setRight(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.resume.name} · {v.versionName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button type="button" disabled={!left || !right} onClick={() => void compare()}>
        Compare plaintext snapshots
      </Button>
      {result && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>
                Structural overlap ({result.overlapScore}% similarity via token multiset)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressBar value={result.overlapScore} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{result.leftSummary.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Bullets: {result.leftSummary.bullets}</p>
              <p>Skills: {result.leftSummary.skills}</p>
              <p>Sections: {result.leftSummary.sections}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{result.rightSummary.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Bullets: {result.rightSummary.bullets}</p>
              <p>Skills: {result.rightSummary.skills}</p>
              <p>Sections: {result.rightSummary.sections}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Risk signal</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-zinc-500">
              Use this heuristic diff as a QA pass before swapping versions blindly.
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 md:grid-cols-2 md:gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="font-semibold">Only on A</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.onlyLeft.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Only on B</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.onlyRight.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

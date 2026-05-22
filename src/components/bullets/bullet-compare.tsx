"use client";

import { compareBullets } from "@/lib/engines/bullet-scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui";

export function BulletCompare({
  textA,
  textB,
  onClose,
}: {
  textA: string;
  textB: string;
  onClose: () => void;
}) {
  const result = compareBullets(textA, textB);

  return (
    <Card className="border-indigo-200 dark:border-indigo-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bullet comparison</CardTitle>
        <Button size="sm" variant="ghost" type="button" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {(["a", "b"] as const).map((side) => {
          const score = side === "a" ? result.a : result.b;
          const text = side === "a" ? textA : textB;
          const winner = result.winner === side;
          return (
            <div key={side} className="rounded-lg border p-4 dark:border-zinc-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Version {side.toUpperCase()}</span>
                {winner && <Badge variant="success">Stronger</Badge>}
              </div>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl font-bold">{score.totalScore}</span>
                <span className="text-xs text-zinc-500">/ 100</span>
              </div>
              <ProgressBar value={score.totalScore} />
              <ul className="mt-3 space-y-1 text-xs">
                {score.strengths.map((s) => (
                  <li key={s} className="text-emerald-600">
                    + {s}
                  </li>
                ))}
                {score.weaknesses.map((w) => (
                  <li key={w} className="text-amber-600">
                    − {w}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
      <p className="px-5 pb-4 text-sm text-zinc-500">Score gap: {result.diff} points</p>
    </Card>
  );
}

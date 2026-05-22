"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoverLetter } from "@prisma/client";
import Link from "next/link";

export function CoverLettersBuilder() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);

  useEffect(() => {
    fetch("/api/cover-letters")
      .then((r) => r.json())
      .then(setLetters)
      .catch(() => toast.error("Failed to load letters"));
  }, []);

  async function compose() {
    const res = await fetch("/api/cover-letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Cold outreach • ${new Date().toLocaleDateString()}`,
        template: "software-engineering",
        fields: {
          name: "Alex Chen",
          date: new Date().toLocaleDateString(),
          company: "PlanetScale",
          role: "Summer SWE Intern",
          topExperiences: "scaled Next.js dashboards at TechFlow",
          topSkills: "TypeScript, React, Postgres, distributed systems instincts",
          whyCompany: "The team's focus on deterministic infra appeals to how I prototype responsibly.",
          whyRole: "I want to deepen impact on infra-adjacent product surfaces.",
          closing: "Thanks for reviewing my application.",
        },
      }),
    });
    const letter = await res.json();
    if (!res.ok) {
      toast.error(letter.error ?? "Compose failed");
      return;
    }
    setLetters((prev) => [letter, ...prev]);
    toast.success("Letter templated");
  }

  async function destroy(id: string) {
    const res = await fetch(`/api/cover-letters/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setLetters((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void compose()}>
          Generate software template draft
        </Button>
        <Link href="/job-descriptions" className="text-sm text-indigo-600 underline">
          Pull specifics from JDs
        </Link>
      </div>
      {letters.map((letter) => (
        <Card key={letter.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{letter.title}</CardTitle>
              <p className="text-xs text-zinc-500 capitalize">{letter.template}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => void destroy(letter.id)}>
              Delete
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
              {letter.content}
            </pre>
          </CardContent>
        </Card>
      ))}
      {!letters.length && <p className="text-sm text-zinc-500">No cover letters yet.</p>}
    </div>
  );
}

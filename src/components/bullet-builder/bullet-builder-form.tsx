"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BulletBuilderFields } from "@/lib/engines/bullet-builder";

const ROLES = [
  "software-engineering",
  "ai-ml",
  "data-analysis",
  "product-management",
  "business-analysis",
  "marketing",
  "finance",
  "research",
  "leadership",
  "startup-founder",
  "hackathon",
  "campus",
  "volunteer",
  "operations",
] as const;

export function BulletBuilderForm() {
  const form = useForm<BulletBuilderFields & { role: string }>({
    defaultValues: {
      what: "",
      problem: "",
      tool: "",
      audience: "",
      outcome: "",
      metric: "",
      skill: "",
      role: "software-engineering",
    },
  });
  const [drafts, setDrafts] = useState<string[]>([]);

  async function generate() {
    const res = await fetch("/api/bullet-build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.getValues()),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    setDrafts(j.drafts as string[]);
    toast.success("Drafts ready");
  }

  async function savePrimary() {
    const text = drafts[0];
    if (!text) return toast.error("Generate first");
    const res = await fetch("/api/bullets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, category: "technical" }),
    });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error ?? "Save failed");
      return;
    }
    toast.success("Saved to bullet bank");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Structured inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="block">
            Role archetype
            <select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("role")}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {(
            ["what", "problem", "tool", "audience", "outcome", "metric", "skill"] as const
          ).map((field) => (
            <label key={field} className="block capitalize">
              {field}
              <input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register(field)} />
            </label>
          ))}
          <div className="flex gap-3">
            <Button type="button" onClick={() => void generate()}>
              Generate templates
            </Button>
            <Button type="button" variant="outline" onClick={() => void savePrimary()}>
              Save first bullet
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.length === 0 && <p className="text-sm text-zinc-500">Structured prompts produce metrics-forward bullets.</p>}
          <ul className="space-y-3 text-sm">
            {drafts.map((d, i) => (
              <li key={i} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                {d}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

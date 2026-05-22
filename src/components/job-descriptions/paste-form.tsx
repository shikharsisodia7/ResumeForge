"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { JOB_CATEGORIES } from "@/lib/constants";

export function JobPasteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("software-engineering");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, category, descriptionText: text }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save JD");
      toast.success("Job description saved");
      router.push(`/job-descriptions/${j.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm md:col-span-2">
        Title
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="text-sm">
        Company
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      <label className="text-sm">
        Location
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>
      <label className="text-sm md:col-span-2">
        Category
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {JOB_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/-/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm md:col-span-2">
        Paste full JD
        <textarea
          rows={10}
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="md:col-span-2">
        <Button type="button" disabled={busy || !title || !company || !text} onClick={() => void submit()}>
          Parse & save
        </Button>
      </div>
    </div>
  );
}

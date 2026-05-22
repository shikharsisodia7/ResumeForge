"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Hits = Record<string, { type: string; id: string; title: string; subtitle?: string }[]>;

export function GlobalSearchPanel() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hits | null>(null);

  async function search() {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Search blocked");
      return;
    }
    setHits({
      resumes: data.resumes,
      jobs: data.jobs,
      bullets: data.bullets,
      profiles: data.profiles,
      applications: data.applications,
    });
    toast.success("Search complete");
  }

  function href(type: string, id: string) {
    if (type === "resume") return "/resumes";
    if (type === "job") return `/job-descriptions/${id}`;
    if (type === "bullet") return "/bullets";
    if (type === "application") return `/interview-prep/${id}`;
    return `/master-profile`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-[220px] flex-1 rounded-xl border px-4 py-2 dark:border-zinc-700 dark:bg-zinc-950" placeholder="keyword, employer, bullet…" />
        <Button type="button" disabled={query.trim().length < 2} onClick={() => void search()}>
          Search
        </Button>
      </div>
      {hits &&
        Object.entries(hits).map(([bucket, items]) => (
          <Card key={bucket}>
            <CardHeader>
              <CardTitle className="capitalize">{bucket}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={`${bucket}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-zinc-500">{item.subtitle}</p>}
                  </div>
                  <Link href={href(item.type, item.id)} className="text-sm text-indigo-600 underline">
                    Open
                  </Link>
                </div>
              ))}
              {!items.length && <p className="text-sm text-zinc-500">No matches.</p>}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

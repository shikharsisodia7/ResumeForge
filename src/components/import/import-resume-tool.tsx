"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImportResumeTool() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string[] | null>(null);
  const [sections, setSections] = useState<{ title: string; type: string }[]>([]);

  async function ingest(createBullets: boolean) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: text, createBullets }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Import failed");
      return;
    }
    setPreview(j.bulletsPreview ?? []);
    setSections((j.sections as { title: string; type: string }[])?.map((s) => ({ title: s.title, type: s.type })) ?? []);
    toast.success(`Parsed ${j.sections?.length ?? 0} sections, ${j.extractedBulletCount} bullets (${j.createdBullets} saved)`);
  }

  return (
    <div className="space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder="Paste a resume exported as plain text" className="w-full rounded-xl border px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void ingest(false)}>
          Analyze only
        </Button>
        <Button type="button" onClick={() => void ingest(true)}>
          Import + create bullets (max 80)
        </Button>
      </div>
      {sections.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Detected sections</p>
          <ul className="list-disc pl-5 text-sm">
            {sections.map((s) => (
              <li key={`${s.type}-${s.title}`}>
                {s.title}{" "}
                <span className="text-xs text-zinc-500">({s.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview && (
        <div>
          <p className="text-sm font-semibold">Bullet previews</p>
          <ul className="space-y-2 text-sm">
            {preview.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

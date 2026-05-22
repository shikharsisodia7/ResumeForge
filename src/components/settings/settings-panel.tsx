"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DictionaryRow = {
  id: string;
  category?: string;
  type?: string;
  terms?: string | null;
  verbs?: string | null;
};

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [keywordDicts, setKeywordDicts] = useState<DictionaryRow[]>([]);
  const [verbDicts, setVerbDicts] = useState<DictionaryRow[]>([]);
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);

  async function hydrate() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (!res.ok) {
      toast.error("Could not hydrate settings");
      return;
    }
    setKeywordDicts(data.keywordDicts);
    setVerbDicts(data.verbDicts);
    setActiveKeywordId((current) => {
      if (current) return current;
      return data.keywordDicts[0]?.id ?? null;
    });
  }

  useEffect(() => {
    void hydrate();
  }, []);

  const activeKeyword = keywordDicts.find((k) => k.id === activeKeywordId) ?? keywordDicts[0];

  const keywordDraft = useMemo(() => {
    if (!activeKeyword?.terms) return "[]";
    try {
      return JSON.stringify(JSON.parse(activeKeyword.terms), null, 2);
    } catch {
      return activeKeyword.terms;
    }
  }, [activeKeyword]);

  async function saveKeyword(termText: string) {
    if (!activeKeyword?.category) return;
    const parsed = JSON.parse(termText);
    const res = await fetch("/api/dictionaries/keywords", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeKeyword.category, terms: parsed }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed saving dictionary");
      return;
    }
    toast.success(`Updated ${activeKeyword.category}`);
    void hydrate();
  }

  async function downloadBackup() {
    const res = await fetch("/api/backup");
    const payload = await res.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resume-tailor-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  async function persistVerbs(kind: string, raw: string) {
    try {
      const verbs = JSON.parse(raw);
      const res = await fetch("/api/dictionaries/verbs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, verbs }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error ?? "Failed");
        return;
      }
      toast.success(`${kind} verbs saved`);
      void hydrate();
    } catch {
      toast.error("Bad JSON array");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme & backup</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant={theme === "light" ? "primary" : "outline"} size="sm" onClick={() => setTheme("light")}>
            Light
          </Button>
          <Button type="button" variant={theme === "dark" ? "primary" : "outline"} size="sm" onClick={() => setTheme("dark")}>
            Dark
          </Button>
          <Button type="button" variant={theme === "system" ? "primary" : "outline"} size="sm" onClick={() => setTheme("system")}>
            System
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void downloadBackup()}>
            Download workspace backup JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword dictionaries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {keywordDicts.map((entry) => (
              <Button
                key={entry.id}
                type="button"
                size="sm"
                variant={entry.id === activeKeyword?.id ? "primary" : "outline"}
                onClick={() => setActiveKeywordId(entry.id)}
              >
                {entry.category}
              </Button>
            ))}
          </div>
          <textarea
            key={activeKeyword?.id}
            rows={14}
            defaultValue={keywordDraft}
            id="dictionary-editor"
            className="w-full rounded-xl border px-4 py-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              try {
                const value = (document.getElementById("dictionary-editor") as HTMLTextAreaElement).value;
                void saveKeyword(value);
              } catch {
                toast.error("Invalid JSON");
              }
            }}
          >
            Save active dictionary
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verb lists</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {verbDicts.map((verb) => (
            <VerbEditor key={verb.id} kind={verb.type ?? "strong"} initial={verb.verbs ?? "[]"} onSave={(raw) => void persistVerbs(verb.type ?? "strong", raw)} />
          ))}
          {!verbDicts.length && <p className="text-sm text-zinc-500">No verb dictionaries seeded.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function VerbEditor({ kind, initial, onSave }: { kind: string; initial: string; onSave: (raw: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="rounded-lg border px-4 py-3 text-sm dark:border-zinc-800">
      <p className="font-semibold capitalize">{kind}</p>
      <textarea rows={8} value={value} onChange={(e) => setValue(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" />
      <Button className="mt-2" type="button" size="sm" variant="outline" onClick={() => onSave(value)}>
        Save verbs
      </Button>
    </div>
  );
}

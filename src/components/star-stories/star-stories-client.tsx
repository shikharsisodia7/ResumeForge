"use client";

import { useEffect, useMemo, useState } from "react";
import type { StarStory } from "@prisma/client";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function StarStoriesClient() {
  const [rows, setRows] = useState<StarStory[]>([]);
  const [draft, setDraft] = useState({ situation: "", task: "", action: "", result: "" });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/star-stories");
    setRows(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function createStory() {
    const res = await fetch("/api/star-stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    setRows((prev) => [j, ...prev]);
    setDraft({ situation: "", task: "", action: "", result: "" });
    toast.success("STAR logged");
  }

  const cols = useMemo(
    () => [
      {
        key: "situation",
        header: "Situation",
        accessor: (s: StarStory) => `${s.situation} ${s.task}`,
      },
      {
        key: "result",
        header: "Result",
        accessor: (s: StarStory) => s.result,
      },
      {
        key: "score",
        header: "Strength",
        accessor: (s: StarStory) => `${s.strengthScore}`,
        render: (s: StarStory) => <Badge variant="success">{s.strengthScore}</Badge>,
      },
      {
        key: "delete",
        header: "",
        accessor: () => "",
        render: (s: StarStory) => (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmId(s.id)}>
            Remove
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {( ["situation", "task", "action", "result"] as const).map((field) => (
          <label key={field} className="text-sm capitalize md:col-span-1">
            {field}
            <textarea rows={field === "result" ? 4 : 3} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
          </label>
        ))}
        <div className="md:col-span-2">
          <Button type="button" onClick={() => void createStory()}>
            Save STAR
          </Button>
        </div>
      </div>
      <DataTable rows={rows} columns={cols} searchable />
      <ConfirmDialog
        open={!!confirmId}
        title="Delete STAR story?"
        variant="danger"
        confirmLabel="Delete"
        onOpenChange={(o) => !o && setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return;
          const res = await fetch(`/api/star-stories/${confirmId}`, { method: "DELETE" });
          if (!res.ok) {
            toast.error("Delete failed");
            return;
          }
          setRows((prev) => prev.filter((r) => r.id !== confirmId));
        }}
      />
    </div>
  );
}


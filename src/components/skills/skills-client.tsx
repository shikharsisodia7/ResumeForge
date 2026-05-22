"use client";

import { useEffect, useMemo, useState } from "react";
import type { Skill } from "@prisma/client";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui";
import { toast } from "sonner";

export function SkillsClient() {
  const [rows, setRows] = useState<Skill[]>([]);

  async function load() {
    const res = await fetch("/api/skills");
    setRows(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(id: string, data: Partial<Skill>) {
    const res = await fetch(`/api/skills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "failed");
      return;
    }
    setRows((prev) => prev.map((s) => (s.id === id ? j : s)));
    toast.success("Skill updated");
  }

  const cols = useMemo(
    () => [
      {
        key: "name",
        header: "Skill",
        accessor: (s: Skill) => s.name,
      },
      {
        key: "category",
        header: "Category",
        accessor: (s: Skill) => s.category,
        render: (s: Skill) => (
          <Badge variant="default" className="capitalize">
            {s.category}
          </Badge>
        ),
      },
      {
        key: "proficiency",
        header: "Level",
        accessor: (s: Skill) => s.proficiency,
        render: (s: Skill) => (
          <select className="rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950" defaultValue={s.proficiency} onBlur={(ev) => void persist(s.id, { proficiency: ev.target.value })}>
            {["junior", "intermediate", "advanced", "expert"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "evidenceStrength",
        header: "Evidence",
        accessor: (s: Skill) => `${s.evidenceStrength}`,
        render: (s: Skill) => (
          <div>
            <div className="mb-1 text-xs text-zinc-500">Strength vs proof gap</div>
            <ProgressBar value={s.evidenceStrength} />
            {s.evidenceStrength < 40 && <p className="mt-1 text-xs text-amber-600">Add bullets or projects referencing this skill.</p>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        accessor: () => "",
        render: (s: Skill) => (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() =>
              persist(s.id, {
                evidenceStrength: Math.min(100, (s.relatedBullets ?? "").split(",").length * 25 || 65),
              })
            }
          >
            Recalculate
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          const res = await fetch("/api/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "New Capability" }),
          });
          const j = await res.json();
          if (!res.ok) {
            toast.error(j.error ?? "Failed");
            return;
          }
          setRows((prev) => [...prev, j]);
        }}
      >
        Add skill
      </Button>
      <DataTable rows={rows} columns={cols} searchable />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreCircle } from "@/components/ui";
import { DataTable } from "@/components/shared/data-table";
import { scoreProjectReadiness } from "@/lib/engines/tailoring-engine";
import Link from "next/link";

export function ProjectsClient() {
  const [rows, setRows] = useState<(Project & { bullets?: { text: string }[] })[]>([]);

  async function load() {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setRows(data as typeof rows);
  }

  useEffect(() => {
    void load();
  }, []);

  const cols = useMemo(
    () => [
      {
        key: "name",
        header: "Project",
        accessor: (p: typeof rows[number]) => p.name,
        render: (p: typeof rows[number]) => <span className="font-medium">{p.name}</span>,
      },
      {
        key: "readinessScore",
        header: "Stored score",
        accessor: (p: typeof rows[number]) => `${p.readinessScore}`,
        render: (p: typeof rows[number]) => <Badge variant={p.readinessScore >= 70 ? "success" : "warning"}>{p.readinessScore}</Badge>,
      },
      {
        key: "proof",
        header: "Proof quality",
        accessor: (p: typeof rows[number]) => p.shortDescription ?? "",
        render: (p: typeof rows[number]) => {
          const { score, warnings } = scoreProjectReadiness(p);
          return (
            <div className="flex items-center gap-3">
              <ScoreCircle score={score} size={48} />
              <div className="text-xs text-zinc-500">
                {warnings.slice(0, 2).map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        accessor: () => "",
        render: (p: typeof rows[number]) => (
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={async () => {
              const { score } = scoreProjectReadiness(p);
              const res = await fetch(`/api/projects/${p.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ readinessScore: score }),
              });
              if (!res.ok) {
                toast.error("Could not persist score");
                return;
              }
              toast.success(`Saved readiness ${score}`);
              void load();
            }}
          >
            Persist score
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            const res = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "New project hub" }),
            });
            const j = await res.json();
            if (!res.ok) {
              toast.error(j.error ?? "Failed");
              return;
            }
            setRows((prev) => [...prev, j]);
            toast.success("Project added");
          }}
        >
          Add project
        </Button>
        <Link href="/bullets">
          <Button size="sm" variant="ghost" type="button">
            Connect bullets
          </Button>
        </Link>
      </div>
      <DataTable rows={rows.map((r) => ({ ...r })) as (Project & { id: string })[]} columns={cols} searchable />
    </div>
  );
}

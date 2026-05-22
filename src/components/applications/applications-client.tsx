"use client";

import { useEffect, useMemo, useState } from "react";
import type { Application } from "@prisma/client";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";

export function ApplicationsClient({ initial }: { initial: Application[] }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("Could not reload applications"));
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((a) => map.set(a.status, (map.get(a.status) ?? 0) + 1));
    return APPLICATION_STATUSES.map((name) => ({ name, total: map.get(name) ?? 0 }));
  }, [rows]);

  const cols = useMemo(
    () => [
      { key: "company", header: "Company", accessor: (a: Application) => a.company },
      { key: "role", header: "Role", accessor: (a: Application) => a.role },
      {
        key: "status",
        header: "Status",
        accessor: (a: Application) => a.status,
        render: (a: Application) => (
          <select
            className="rounded border px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            defaultValue={a.status}
            onBlur={async (ev) => {
              const res = await fetch(`/api/applications/${a.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: ev.target.value }),
              });
              if (!res.ok) {
                toast.error("Update failed");
                return;
              }
              const j = await res.json();
              setRows((prev) => prev.map((row) => (row.id === a.id ? j : row)));
              toast.success("Status updated");
            }}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "match",
        header: "Match @ apply",
        accessor: (a: Application) => `${a.matchScoreAtApply ?? "—"}`,
        render: (a: Application) => <Badge variant="default">{a.matchScoreAtApply ?? "—"}</Badge>,
      },
      {
        key: "prep",
        header: "Prep",
        accessor: () => "",
        render: (a: Application) => (
          <Link href={`/interview-prep/${a.id}`} className="text-indigo-600 hover:underline text-xs">
            Open
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <p className="text-xs uppercase text-zinc-500">Pipeline volume</p>
          <div className="mt-4 h-[280px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} height={70} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value ?? 0, "Applications"]} />
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase text-zinc-500">Conversion lens</p>
          <div className="mt-6 space-y-2 text-sm">
            <p>
              Saved → Applied spotlight:{" "}
              <span className="font-semibold">
                {Math.round((rows.filter((r) => r.status === "applied").length / Math.max(1, rows.length)) * 100)}%
              </span>
            </p>
            <p>Offers: {rows.filter((r) => r.status === "offer" || r.status === "accepted").length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const res = await fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ company: "New company", role: "Target role" }),
            });
            const j = await res.json();
            if (!res.ok) {
              toast.error(j.error ?? "Failed");
              return;
            }
            setRows((prev) => [j, ...prev]);
          }}
        >
          Add application
        </Button>
      </div>

      <DataTable rows={rows} columns={cols} searchable />
    </div>
  );
}

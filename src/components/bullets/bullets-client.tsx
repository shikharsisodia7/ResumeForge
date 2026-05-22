"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Bullet } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { BULLET_CATEGORIES, BULLET_STATUSES } from "@/lib/constants";
import { BulletCompare } from "@/components/bullets/bullet-compare";
import Link from "next/link";

export function BulletsClient() {
  const [rows, setRows] = useState<Bullet[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ a: Bullet; b: Bullet } | null>(null);
  const [pickCompare, setPickCompare] = useState<Bullet | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const q = params.toString();
    const res = await fetch(`/api/bullets${q ? `?${q}` : ""}`);
    if (!res.ok) {
      toast.error("Could not load bullets");
      return;
    }
    setRows(await res.json());
  }, [category, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, data: Partial<Bullet>) {
    const res = await fetch(`/api/bullets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Update failed");
      return;
    }
    setRows((prev) => prev.map((b) => (b.id === id ? j : b)));
    return j as Bullet;
  }

  async function remove(id: string) {
    const res = await fetch(`/api/bullets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setRows((prev) => prev.filter((b) => b.id !== id));
    toast.success("Removed");
  }

  async function duplicate(b: Bullet) {
    const res = await fetch("/api/bullets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: b.text,
        category: b.category,
        status: "edited",
        experienceId: b.experienceId,
        projectId: b.projectId,
        skillTags: b.skillTags,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Duplicate failed");
      return;
    }
    setRows((prev) => [j, ...prev]);
    toast.success("Duplicated");
  }

  const cols = useMemo(
    () => [
      {
        key: "text",
        header: "Bullet",
        accessor: (b: Bullet) => b.text,
        render: (b: Bullet) => <span className="text-sm">{b.text}</span>,
      },
      {
        key: "category",
        header: "Category",
        accessor: (b: Bullet) => b.category,
        render: (b: Bullet) => (
          <Badge variant="partial" className="capitalize">
            {b.category}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        accessor: (b: Bullet) => b.status,
        render: (b: Bullet) => (
          <select
            className="rounded border px-2 py-1 text-xs capitalize dark:border-zinc-700 dark:bg-zinc-950"
            defaultValue={b.status}
            onChange={(e) => void patch(b.id, { status: e.target.value })}
          >
            {BULLET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "totalScore",
        header: "Score",
        accessor: (b: Bullet) => `${b.totalScore}`,
        render: (b: Bullet) => (
          <Badge variant={b.totalScore >= 80 ? "success" : b.totalScore >= 60 ? "warning" : "missing"}>
            {b.totalScore}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        accessor: () => "",
        render: (b: Bullet) => (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(b.text);
                toast.success("Copied");
              }}
            >
              Copy
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => void duplicate(b)}>
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => {
                if (!pickCompare) {
                  setPickCompare(b);
                  toast.message("Select second bullet to compare");
                  return;
                }
                setCompare({ a: pickCompare, b });
                setPickCompare(null);
              }}
            >
              Compare
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => void patch(b.id, { status: "archived" })}
            >
              Archive
            </Button>
            <Link href={`/resume-builder?bullet=${b.id}`}>
              <Button size="sm" variant="outline" type="button">
                Add to resume
              </Button>
            </Link>
            <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmId(b.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [pickCompare]
  );

  return (
    <div className="space-y-4">
      {pickCompare && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          Comparing against: &quot;{pickCompare.text.slice(0, 60)}…&quot; — click Compare on another row.
          <Button className="ml-2" size="sm" variant="ghost" type="button" onClick={() => setPickCompare(null)}>
            Cancel
          </Button>
        </p>
      )}
      {compare && (
        <BulletCompare textA={compare.a.text} textB={compare.b.text} onClose={() => setCompare(null)} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="ml-2 rounded-lg border px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">All</option>
            {BULLET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 rounded-lg border px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">All</option>
            {BULLET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Link href="/bullet-builder">
          <Button size="sm" type="button">
            New bullet
          </Button>
        </Link>
      </div>
      <DataTable<Bullet & { id: string }> rows={rows} columns={cols} searchable />
      <ConfirmDialog
        open={!!confirmId}
        title="Delete bullet?"
        description="This permanently removes the bullet entry."
        variant="danger"
        confirmLabel="Delete"
        onOpenChange={(o) => !o && setConfirmId(null)}
        onConfirm={async () => {
          if (confirmId) await remove(confirmId);
        }}
      />
    </div>
  );
}

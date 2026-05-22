"use client";

import { useEffect, useMemo, useState } from "react";
import type { Experience } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EXPERIENCE_TYPES } from "@/lib/constants";

export function ExperiencesClient() {
  const [rows, setRows] = useState<Experience[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/experiences");
    const data = await res.json();
    setRows(data as Experience[]);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function addRow() {
    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New role", organization: "Company" }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    setRows((prev) => [...prev, j]);
    toast.success("Added experience");
  }

  async function patch(id: string, data: Partial<Experience>) {
    const res = await fetch(`/api/experiences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Update failed");
      return;
    }
    setRows((prev) => prev.map((e) => (e.id === id ? j : e)));
  }

  async function remove(id: string) {
    const res = await fetch(`/api/experiences/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed");
  }

  const cols = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        accessor: (e: Experience) => e.title,
        render: (e: Experience) => (
          <InlineField
            value={e.title}
            onBlur={(v) => {
              void patch(e.id, { title: v });
            }}
          />
        ),
      },
      {
        key: "organization",
        header: "Organization",
        accessor: (e: Experience) => e.organization,
        render: (e: Experience) => (
          <InlineField
            value={e.organization}
            onBlur={(v) => {
              void patch(e.id, { organization: v });
            }}
          />
        ),
      },
      {
        key: "dates",
        header: "Timeline",
        accessor: (e: Experience) => `${e.startDate ?? ""}-${e.endDate ?? ""}`,
        render: (e: Experience) => (
          <div className="flex gap-2 text-xs">
            <InlinePlaceholder
              value={e.startDate ?? ""}
              placeholder="start"
              onBlur={(v) => {
                void patch(e.id, { startDate: v || null });
              }}
            />
            <InlinePlaceholder
              value={e.endDate ?? ""}
              placeholder="end"
              onBlur={(v) => {
                void patch(e.id, { endDate: v || null });
              }}
            />
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        accessor: (e: Experience) => e.type,
        render: (e: Experience) => (
          <select
            className="w-full rounded border px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
            defaultValue={e.type}
            onBlur={(ev) =>
              patch(e.id, {
                type: ev.target.value,
              })
            }
          >
            {EXPERIENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "actions",
        header: "",
        accessor: () => "",
        render: (e: Experience) => (
          <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmId(e.id)}>
            Delete
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => void addRow()}>
          Add row
        </Button>
      </div>
      <DataTable rows={rows} columns={cols} searchable />
      <ConfirmDialog
        open={!!confirmId}
        title="Delete experience?"
        onOpenChange={(o) => !o && setConfirmId(null)}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirmId) return;
          await remove(confirmId);
        }}
      />
    </div>
  );
}

function InlineField({ value, onBlur }: { value: string; onBlur: (v: string) => void }) {
  return (
    <input
      key={value}
      defaultValue={value}
      className="w-full rounded-lg border px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      onBlur={(e) => onBlur(e.target.value)}
    />
  );
}

function InlinePlaceholder({
  value,
  placeholder,
  onBlur,
}: {
  value: string;
  placeholder: string;
  onBlur: (v: string) => void;
}) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      className="w-24 rounded border px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
      onBlur={(e) => onBlur(e.target.value)}
    />
  );
}

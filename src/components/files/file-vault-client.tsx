"use client";

import { useEffect, useState } from "react";
import type { FileAsset } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function FileVaultClient() {
  const [rows, setRows] = useState<FileAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/files")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("Failed to load vault"));
  }, []);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList.item(i)!;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", "resume");
        const res = await fetch("/api/files", { method: "POST", body: fd });
        const asset = await res.json();
        if (!res.ok) {
          toast.error(asset.error ?? "Upload failed");
          return;
        }
        setRows((prev) => [asset, ...prev]);
      }
      toast.success("File(s) saved to local uploads/");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300 p-6 text-sm dark:border-zinc-700">
        <span className="font-medium">Upload career files (stored in ./uploads)</span>
        <input type="file" multiple disabled={uploading} onChange={(e) => void uploadFiles(e.target.files)} />
        <p className="text-xs text-zinc-500">Resumes, JDs, cover letters, transcripts, screenshots — metadata in SQLite.</p>
      </label>
      <DataTable<FileAsset & { id: string }>
        rows={rows}
        columns={[
          { key: "fileName", header: "File", accessor: (f: FileAsset) => f.fileName },
          { key: "category", header: "Category", accessor: (f: FileAsset) => f.category },
          {
            key: "importance",
            header: "Importance",
            render: (f: FileAsset) => (
              <Badge variant={f.importance === "high" ? "strong" : "default"} className="capitalize">
                {f.importance}
              </Badge>
            ),
          },
          { key: "filePath", header: "Path", accessor: (f: FileAsset) => f.filePath },
          { key: "notes", header: "Notes", accessor: (f: FileAsset) => f.notes ?? "" },
          {
            key: "actions",
            header: "",
            render: (f: FileAsset) => (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await fetch(`/api/files/${f.id}`, { method: "DELETE" });
                  setRows((prev) => prev.filter((row) => row.id !== f.id));
                  toast.success("Removed");
                }}
              >
                Remove
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}

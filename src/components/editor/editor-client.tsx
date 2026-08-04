"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { ActivePromptsList } from "@/components/editor/active-prompts-list";
import { CustomizePanel } from "@/components/editor/customize-panel";
import { DocumentPreview } from "@/components/editor/document-preview";
import { VersionHeader } from "@/components/editor/version-header";
import {
  ApiError,
  listPrompts,
  listVersionPrompts,
  reorderVersionPrompts,
  toggleVersionPrompt,
} from "@/lib/client/api";
import type { PromptItem, VersionDetail, VersionPromptItem } from "@/lib/client/types";
import { cn } from "@/lib/utils";

export function EditorClient({
  initialVersion,
  initialActivePrompts,
  initialSavedPrompts,
}: {
  initialVersion: VersionDetail;
  initialActivePrompts: VersionPromptItem[];
  initialSavedPrompts: PromptItem[];
}) {
  const [version, setVersion] = useState(initialVersion);
  const [activePrompts, setActivePrompts] = useState(initialActivePrompts);
  const [savedPrompts, setSavedPrompts] = useState(initialSavedPrompts);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function refreshVersionPrompts() {
    try {
      const { versionPrompts } = await listVersionPrompts(version.id);
      setActivePrompts(versionPrompts);
    } catch {
      // Non-fatal — the version content itself already updated.
    }
  }

  async function refreshSavedPrompts() {
    try {
      const { prompts } = await listPrompts();
      setSavedPrompts(prompts);
    } catch {
      // Non-fatal.
    }
  }

  async function handleReorder(orderedIds: string[]) {
    const previous = activePrompts;
    const reordered = orderedIds
      .map((id) => previous.find((vp) => vp.id === id))
      .filter((vp): vp is VersionPromptItem => Boolean(vp));
    setActivePrompts(reordered);
    try {
      const { versionPrompts } = await reorderVersionPrompts(version.id, orderedIds);
      setActivePrompts(versionPrompts);
    } catch (error) {
      setActivePrompts(previous);
      toast.error(error instanceof ApiError ? error.message : "Couldn't reorder prompts");
    }
  }

  async function handleToggle(versionPromptId: string, isActive: boolean) {
    setTogglingId(versionPromptId);
    try {
      const { versionPrompt } = await toggleVersionPrompt(version.id, versionPromptId, isActive);
      setActivePrompts((prev) => prev.map((vp) => (vp.id === versionPromptId ? versionPrompt : vp)));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update this prompt");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <VersionHeader version={version} onChange={setVersion} />

      <div className="mb-4 flex gap-1 rounded-md border border-border bg-muted p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("edit")}
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-sm font-medium",
            mobileTab === "edit" ? "bg-card shadow-sm" : "text-muted-foreground",
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-sm font-medium",
            mobileTab === "preview" ? "bg-card shadow-sm" : "text-muted-foreground",
          )}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className={cn("space-y-4", mobileTab !== "edit" && "hidden lg:block")}>
          <Card>
            <CardContent className="pt-6">
              <CustomizePanel
                versionId={version.id}
                savedPrompts={savedPrompts}
                onApplied={(updated) => {
                  setVersion(updated);
                  refreshVersionPrompts();
                }}
                onPromptSaved={refreshSavedPrompts}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-3 text-sm font-semibold">Active prompts</h3>
              <ActivePromptsList
                versionPrompts={activePrompts}
                onReorder={handleReorder}
                onToggle={handleToggle}
                busyId={togglingId}
              />
            </CardContent>
          </Card>
        </div>

        <div className={cn("overflow-x-auto rounded-lg bg-muted p-6", mobileTab !== "preview" && "hidden lg:block")}>
          <DocumentPreview content={version.contentJson} style={version.styleJson} />
        </div>
      </div>
    </div>
  );
}

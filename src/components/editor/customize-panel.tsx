"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ApiError, createPrompt, customizeVersion } from "@/lib/client/api";
import type { PromptItem, VersionDetail } from "@/lib/client/types";

export function CustomizePanel({
  versionId,
  savedPrompts,
  onApplied,
  onPromptSaved,
}: {
  versionId: string;
  savedPrompts: PromptItem[];
  onApplied: (version: VersionDetail) => void;
  onPromptSaved: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [applying, setApplying] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveDescription, setSaveDescription] = useState("");
  const [saveShared, setSaveShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [applyingSaved, setApplyingSaved] = useState(false);

  async function applyInstruction() {
    if (!instruction.trim()) {
      toast.error("Enter an instruction first");
      return;
    }
    setApplying(true);
    try {
      const result = await customizeVersion(versionId, { instruction: instruction.trim() });
      if (result.rejected) {
        toast.warning(result.explanation);
      } else {
        toast.success(result.explanation || "Applied");
        setInstruction("");
        onApplied(result.version);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't apply this instruction");
    } finally {
      setApplying(false);
    }
  }

  async function saveToLibrary() {
    if (!instruction.trim()) {
      toast.error("Enter an instruction first");
      return;
    }
    if (saveShared && !saveDescription.trim()) {
      toast.error("A description is required to share a prompt");
      return;
    }
    setSaving(true);
    try {
      await createPrompt({
        text: instruction.trim(),
        description: saveDescription.trim() || undefined,
        isShared: saveShared,
      });
      toast.success("Saved to your prompt library");
      setSaveOpen(false);
      setSaveDescription("");
      setSaveShared(false);
      onPromptSaved();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save this prompt");
    } finally {
      setSaving(false);
    }
  }

  async function applySavedPrompt() {
    if (!selectedPromptId) return;
    setApplyingSaved(true);
    try {
      const result = await customizeVersion(versionId, { promptId: selectedPromptId });
      if (result.rejected) {
        toast.warning(result.explanation);
      } else {
        toast.success(result.explanation || "Applied");
        onApplied(result.version);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't apply this prompt");
    } finally {
      setApplyingSaved(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="instruction">Customization instruction</Label>
        <Textarea
          id="instruction"
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. "Make my name bigger and bold it" or "Put projects before experience"'
          disabled={applying}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={applyInstruction} disabled={applying}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {applying ? "Applying…" : "Apply"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSaveOpen((v) => !v)} disabled={applying}>
            <BookmarkPlus className="size-3.5" aria-hidden="true" />
            Save to library
          </Button>
        </div>

        {saveOpen && (
          <div className="mt-3 space-y-2 rounded-md border border-border p-3">
            <div>
              <Label htmlFor="save-description">Description (required if shared)</Label>
              <Input
                id="save-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="What visual or organizational effect does this have?"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveShared}
                onChange={(e) => setSaveShared(e.target.checked)}
                className="size-3.5 accent-accent"
              />
              Share with the community
            </label>
            <Button size="sm" onClick={saveToLibrary} disabled={saving}>
              {saving ? "Saving…" : "Save prompt"}
            </Button>
          </div>
        )}
      </div>

      {savedPrompts.length > 0 && (
        <div>
          <Label htmlFor="saved-prompt">Apply a saved prompt</Label>
          <div className="flex gap-2">
            <select
              id="saved-prompt"
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">Choose a saved prompt…</option>
              {savedPrompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.text.length > 60 ? `${p.text.slice(0, 60)}…` : p.text}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={applySavedPrompt} disabled={!selectedPromptId || applyingSaved}>
              {applyingSaved ? "Applying…" : "Apply"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

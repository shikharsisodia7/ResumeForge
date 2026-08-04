"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError, createPrompt, deletePrompt, updatePrompt } from "@/lib/client/api";
import type { PromptItem } from "@/lib/client/types";
import { formatDate } from "@/lib/utils";

export function PromptsClient({ initialPrompts }: { initialPrompts: PromptItem[] }) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [formOpen, setFormOpen] = useState(false);
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PromptItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Prompt text is required");
      return;
    }
    if (isShared && !description.trim()) {
      toast.error("A description is required to share a prompt");
      return;
    }
    setSaving(true);
    try {
      const { prompt } = await createPrompt({
        text: text.trim(),
        description: description.trim() || undefined,
        isShared,
      });
      setPrompts((prev) => [prompt, ...prev]);
      toast.success("Prompt saved");
      setFormOpen(false);
      setText("");
      setDescription("");
      setIsShared(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save this prompt");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleShare(prompt: PromptItem) {
    if (!prompt.isShared && !prompt.description) {
      toast.error("Add a description before sharing this prompt");
      return;
    }
    setBusyId(prompt.id);
    try {
      const { prompt: updated } = await updatePrompt(prompt.id, { isShared: !prompt.isShared });
      setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? updated : p)));
      toast.success(updated.isShared ? "Shared with the community" : "Made private");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update this prompt");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await deletePrompt(pendingDelete.id);
      setPrompts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      toast.success("Prompt deleted");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete this prompt");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setFormOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          New prompt
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-5">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="prompt-text">Prompt text</Label>
                <Textarea
                  id="prompt-text"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Make section headings uppercase and add a divider line"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prompt-description">Description {isShared && "(required)"}</Label>
                <Input
                  id="prompt-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What effect does this have?"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="size-3.5 accent-accent"
                />
                Share with the community
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Saving…" : "Save prompt"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {prompts.length === 0 ? (
        <EmptyState
          title="No saved prompts yet"
          description="Save formatting instructions from the editor, or create one here to reuse across resumes."
        />
      ) : (
        <ul className="space-y-2">
          {prompts.map((prompt) => (
            <li key={prompt.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="text-sm">{prompt.text}</p>
                    {prompt.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{prompt.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {prompt.isShared && <Badge variant="accent">Shared</Badge>}
                      <span className="text-xs text-muted-foreground">Saved {formatDate(prompt.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleShare(prompt)}
                      disabled={busyId === prompt.id}
                      aria-label={prompt.isShared ? "Make private" : "Share with community"}
                    >
                      <Share2 className={prompt.isShared ? "size-4 text-accent" : "size-4"} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(prompt)}
                      aria-label="Delete prompt"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this prompt?"
        description="This removes it from your library. It won't affect resumes it was already applied to."
        confirmLabel="Delete"
        danger
        pending={busyId === pendingDelete?.id}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

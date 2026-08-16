"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError, copyGalleryPrompt, listGalleryPrompts } from "@/lib/client/api";
import type { GalleryPromptItem } from "@/lib/client/types";
import { formatDate } from "@/lib/utils";

export function GalleryClient({
  initialPrompts,
  initialNextCursor,
}: {
  initialPrompts: GalleryPromptItem[];
  initialNextCursor: string | null;
}) {
  const [query, setQuery] = useState("");
  const [prompts, setPrompts] = useState(initialPrompts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const result = await listGalleryPrompts({ q: query.trim() || undefined });
      setPrompts(result.prompts);
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't search the gallery");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const result = await listGalleryPrompts({ q: query.trim() || undefined, cursor: nextCursor });
      setPrompts((prev) => [...prev, ...result.prompts]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't load more prompts");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(prompt: GalleryPromptItem) {
    setCopyingId(prompt.id);
    try {
      const { alreadyCopied } = await copyGalleryPrompt(prompt.id);
      setCopiedIds((prev) => new Set(prev).add(prompt.id));
      toast.success(alreadyCopied ? "Already in your library" : "Copied to your prompt library");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't copy this prompt");
    } finally {
      setCopyingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={runSearch} className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shared prompts…"
            aria-label="Search shared prompts"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading}>
          Search
        </Button>
      </form>

      {prompts.length === 0 ? (
        <EmptyState
          title="No shared prompts found"
          description="Be the first to share a formatting prompt from your library, or try a different search."
        />
      ) : (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="flex items-start justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="text-sm">{prompt.text}</p>
                  {prompt.description && <p className="mt-1 text-xs text-muted-foreground">{prompt.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    by {prompt.creatorDisplayName} · {formatDate(prompt.createdAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleCopy(prompt)}
                  disabled={copyingId === prompt.id || copiedIds.has(prompt.id)}
                >
                  {copiedIds.has(prompt.id) ? "Copied" : copyingId === prompt.id ? "Copying…" : "Copy"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

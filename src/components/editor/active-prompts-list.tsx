"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VersionPromptItem } from "@/lib/client/types";
import { cn } from "@/lib/utils";

export function ActivePromptsList({
  versionPrompts,
  onReorder,
  onToggle,
  busyId,
}: {
  versionPrompts: VersionPromptItem[];
  onReorder: (orderedIds: string[]) => void;
  onToggle: (versionPromptId: string, isActive: boolean) => void;
  busyId: string | null;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = versionPrompts.findIndex((vp) => vp.id === active.id);
    const newIndex = versionPrompts.findIndex((vp) => vp.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(versionPrompts, oldIndex, newIndex).map((vp) => vp.id));
  }

  if (versionPrompts.length === 0) {
    return <p className="text-sm text-muted-foreground">No prompts applied to this version yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={versionPrompts.map((vp) => vp.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5">
          {versionPrompts.map((vp) => (
            <SortableRow key={vp.id} item={vp} onToggle={onToggle} busy={busyId === vp.id} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  onToggle,
  busy,
}: {
  item: VersionPromptItem;
  onToggle: (id: string, isActive: boolean) => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-card p-2.5",
        isDragging && "z-10 shadow-md",
        !item.isActive && "opacity-50",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="Reorder prompt"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm">{item.prompt.text}</p>
        {!item.isActive && (
          <Badge variant="neutral" className="mt-1">
            Inactive
          </Badge>
        )}
      </div>
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={item.isActive}
          disabled={busy}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className="size-3.5 accent-accent"
        />
        Active
      </label>
    </li>
  );
}

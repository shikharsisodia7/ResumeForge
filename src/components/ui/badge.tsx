import type { ComponentPropsWithoutRef } from "react";
import { cn, matchBadge } from "@/lib/utils";

type NativeSpanProps = ComponentPropsWithoutRef<"span">;

export function Badge({
  children,
  className,
  variant = "default",
  title,
  ...rest
}: {

  variant?: "default" | "strong" | "partial" | "missing" | "irrelevant" | "needs-evidence" | "success" | "warning";
  title?: string;
} & Omit<NativeSpanProps, "className"> & { className?: string }) {
  const styles: Record<string, string> = {
    default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    strong: matchBadge("strong"),
    partial: matchBadge("partial"),
    missing: matchBadge("missing"),
    irrelevant: matchBadge("irrelevant"),
    "needs-evidence": matchBadge("needs-evidence"),
  };
  return (
    <span
      title={title}
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[variant], className)}
      {...rest}
    >
      {children}
    </span>
  );
}

export function ScoreCircle({ score, size = 64 }: { score: number; size?: number }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-red-500";
  return (
    <div
      className={cn("relative flex items-center justify-center rounded-full border-4 border-current font-bold", color)}
      style={{ width: size, height: size }}
    >
      <span className="text-lg">{score}</span>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700", className)}>
      <div
        className="h-full rounded-full bg-indigo-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

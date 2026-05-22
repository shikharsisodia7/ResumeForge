import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function matchBadge(status: string): string {
  switch (status) {
    case "strong":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "partial":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "missing":
      return "bg-red-500/15 text-red-600 dark:text-red-400";
    case "irrelevant":
      return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400";
    case "needs-evidence":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    default:
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  }
}

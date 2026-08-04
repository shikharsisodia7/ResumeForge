import { cn } from "@/lib/utils";

const VARIANTS = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-muted text-accent",
  danger: "bg-danger-muted text-danger",
} as const;

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50",
  secondary: "bg-transparent text-foreground border border-border hover:bg-muted disabled:opacity-50",
  ghost: "bg-transparent text-foreground hover:bg-muted disabled:opacity-50",
  danger: "bg-danger text-danger-foreground hover:opacity-90 disabled:opacity-50",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

/**
 * The Button's visual classes, usable on non-<button> elements — e.g. a
 * Next.js <Link> that should look like a button. Nesting an actual <button>
 * inside an <a> (as in `<Link><Button/></Link>`) is invalid HTML (browsers
 * disallow interactive content inside interactive content) and gives
 * assistive tech an ambiguous element to describe; style the link directly
 * with this instead.
 */
export function buttonClassName(
  variant: keyof typeof VARIANTS = "primary",
  size: keyof typeof SIZES = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClassName(variant, size, className)} {...props} />;
});

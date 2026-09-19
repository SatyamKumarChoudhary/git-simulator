import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-ink shadow-[0_10px_30px_-10px_rgb(217_70_239_/_0.7)] hover:brightness-110",
  secondary: "border border-line bg-surface-2 text-ink hover:bg-white/[0.12]",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
  danger: "border border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-200 hover:bg-rose-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-2xl px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Button styling as a class string — also used to style links as buttons. */
export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className?: string): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
      {children}
    </kbd>
  );
}

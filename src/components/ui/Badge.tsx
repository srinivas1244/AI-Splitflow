"use client";

import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "muted";

const variants = {
  default:
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

  success:
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

  danger:
    "bg-rose-500/10 text-rose-400 border-rose-500/20",

  warning:
    "bg-amber-500/10 text-amber-400 border-amber-500/20",

  info:
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",

  muted:
    "bg-white/5 text-slate-400 border-white/10",
};

interface BadgeProps {
  children: React.ReactNode;

  variant?: Variant;

  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        `
        inline-flex
        items-center
        px-2.5
        py-1
        rounded-full
        text-xs
        font-semibold
        border
        `,
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
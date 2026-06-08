"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success";

  size?: "sm" | "md" | "lg";

  loading?: boolean;

  fullWidth?: boolean;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          `
          inline-flex
          items-center
          justify-center
          gap-2
          font-semibold
          rounded-xl
          select-none
          ${disabled ?
          `
            bg-slate-100
            dark:bg-white/5
            text-slate-400
            dark:text-slate-600
            !bg-none
            pointer-events-none
          ` :
          `
            transition-all
            duration-200
            cursor-pointer
          `}
          `,

          size === "sm" &&
          "h-9 px-4 text-xs",

          size === "md" &&
          "h-11 px-5 text-sm",

          size === "lg" &&
          "h-12 px-7 text-base",

          variant === "primary" &&
          `
            text-white
            gradient-brand
            hover:scale-[1.02]
            active:scale-[0.98]
          `,

          variant === "secondary" &&
          `
            bg-white
            dark:bg-white/5
            border
            border-slate-200
            dark:border-white/10
            text-slate-900
            dark:text-slate-200
            hover:bg-slate-50
            dark:hover:bg-white/10
          `,

          variant === "ghost" &&
          `
            text-slate-600
            dark:text-slate-300
            hover:bg-slate-100
            dark:hover:bg-white/5
          `,

          variant === "danger" &&
          `
            bg-rose-50
            dark:bg-rose-500/10
            border
            border-rose-200
            dark:border-rose-500/20
            text-rose-600
            dark:text-rose-400
          `,

          variant === "success" &&
          `
            bg-emerald-50
            dark:bg-emerald-500/10
            border
            border-emerald-200
            dark:border-emerald-500/20
            text-emerald-700
            dark:text-emerald-400
          `,

          fullWidth && "w-full",

          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className="
              w-4
              h-4
              animate-spin
            "
          />
        )}

        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
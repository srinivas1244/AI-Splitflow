"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
  | "default"
  | "sm"
  | "hover"
  | "strong";

  noPadding?: boolean;
}

export const GlassCard = forwardRef<
  HTMLDivElement,
  GlassCardProps
>(
  (
    {
      children,
      className,
      variant = "default",
      noPadding = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          variant === "default" &&
          "glass",

          variant === "sm" &&
          "glass-sm",

          variant === "hover" &&
          "glass glass-hover",

          variant === "strong" &&
          "glass-strong",

          !noPadding && "p-6",

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName =
  "GlassCard";
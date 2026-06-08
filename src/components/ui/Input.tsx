"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;

  error?: string;

  hint?: string;

  leftIcon?: React.ReactNode;

  rightElement?: React.ReactNode;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId =
      id ??
      label
        ?.toLowerCase()
        .replace(/\s+/g, "-");

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="
              text-xs
              uppercase
              tracking-wider
              text-slate-500
              dark:text-slate-400
              font-semibold
            "
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-500
              "
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              `
              w-full
              h-12
              rounded-xl
              bg-slate-100
              dark:bg-white/5
              border
              border-slate-200
              dark:border-white/10
              text-slate-900
              dark:text-white
              placeholder-slate-400
              dark:placeholder-slate-500
              px-4
              transition-all
              duration-200
              outline-none

              focus:border-indigo-500/50
              focus:ring-4
              focus:ring-indigo-500/10
              `,

              leftIcon &&
                "pl-10",

              rightElement &&
                "pr-10",

              error &&
                `
                border-rose-500/50
                focus:ring-rose-500/10
              `,

              className
            )}
            {...props}
          />

          {rightElement && (
            <div
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
              "
            >
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-400">
            {error}
          </p>
        )}

        {!error && hint && (
          <p className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;

  error?: string;
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps
>(
  (
    {
      label,
      error,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId =
      id ??
      label
        ?.toLowerCase()
        .replace(/\s+/g, "-");

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="
              text-xs
              uppercase
              tracking-wider
              text-slate-500
              dark:text-slate-400
              font-semibold
            "
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            `
            w-full
            rounded-xl
            bg-slate-100
            dark:bg-white/5
            border
            border-slate-200
            dark:border-white/10
            text-slate-900
            dark:text-white
            placeholder-slate-400
            dark:placeholder-slate-500
            px-4
            py-3
            min-h-[120px]
            outline-none
            resize-none

            focus:border-indigo-500/50
            focus:ring-4
            focus:ring-indigo-500/10
            `,
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
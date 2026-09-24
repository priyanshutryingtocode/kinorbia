"use client";

import type { MouseEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useFormPending } from "./FormPendingContext";

type SubmitButtonVariant = "primary" | "secondary" | "danger" | "quiet";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: SubmitButtonVariant;
  confirmText?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const variantClasses: Record<SubmitButtonVariant, string> = {
  primary: "border-transparent bg-accent text-white hover:bg-accent-hover",
  secondary:
    "border-rule-strong bg-surface-raised text-content hover:border-highlight/35 hover:bg-surface hover:text-highlight",
  danger: "border-accent/35 bg-accent/5 text-red-200 hover:bg-accent/10",
  quiet: "border-transparent bg-transparent text-content-muted hover:bg-surface-raised hover:text-content",
};

export default function SubmitButton({
  children,
  pendingLabel = "Working...",
  className = "",
  variant = "primary",
  confirmText,
  disabled,
  onClick,
  ...rest
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const actionPending = useFormPending();
  const pending = formPending || actionPending;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || pending) {
      return;
    }
    if (confirmText && !window.confirm(confirmText)) {
      event.preventDefault();
    }
  };

  return (
    <>
      <button
        {...rest}
        type="submit"
        disabled={pending || disabled}
        aria-busy={pending}
        onClick={handleClick}
        className={twMerge(
          "kin-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-2 text-sm font-semibold transition-colors",
          variantClasses[variant],
          className,
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            {pendingLabel}
          </span>
        ) : (
          children
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {pending ? pendingLabel : ""}
      </span>
    </>
  );
}

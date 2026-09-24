"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export default function SubmitButton({
  children,
  pendingLabel = "Working...",
  className = "",
  ...rest
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
        {...rest}
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

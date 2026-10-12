"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { AUTH_INPUT_ICON_CLASS, AUTH_SUBMIT_CLASS } from "@/lib/uiClasses";

type AuthFieldProps = {
  id: string;
  icon: LucideIcon;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  // A short line under the field. Used on sign-up to state the password rule the
  // browser enforces natively but says nothing about.
  hint?: string;
};

export default function AuthField({
  id,
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  hint,
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  // A toggle on any field other than a password would be a control with nothing to
  // do, so it is gated on the type rather than on a prop the callers must remember.
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      {/* The label used to be `sr-only` with the placeholder doing the work, which
          meant it vanished the moment the field was focused -- so anyone
          interrupted mid-form lost track of which box was which. It is now always
          visible.

          Sentence case and `--content-muted` rather than the bronze uppercase
          `kin-overline` used for page kickers: three bronze uppercase labels in a
          column would compete with the one kicker above them, and this is a
          per-control hint rather than an editorial flourish. 13px at medium weight
          keeps it clearly subordinate to the input itself, which sits below it. */}
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-content-muted">
        {label}
      </label>
      <div className="relative group">
        <Icon className={AUTH_INPUT_ICON_CLASS} />
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? label}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          aria-describedby={hintId}
          className={`kin-input kin-input-affix py-3 text-[13px]${isPassword ? " kin-input-affix-end" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            // The label changes with the state rather than staying "show password",
            // because the button's meaning depends on what it will do next, not on
            // what is currently visible.
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
            className="kin-focus absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-control text-content-subtle transition-colors hover:bg-glass-hover hover:text-content"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[10px] text-content-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

// The form-level error, identical in all four forms.
export function AuthError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  // One red, not three: the tint is derived from `--danger` itself, so it is the same hue at
  // 10% and cannot drift from the text again.
  //
  // role="alert": without it a screen reader moves focus on submit and never says why.
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-sheet border border-danger/25 bg-danger/10 px-3 py-2.5 text-[11px] text-danger"
    >
      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function AuthSubmit({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
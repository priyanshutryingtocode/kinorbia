import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { AUTH_INPUT_ICON_CLASS, AUTH_SUBMIT_CLASS } from "@/lib/uiClasses";

// The auth field, written out once.
//
// There are eight of these across login, signup, forgot-password and
// reset-password, and they were all hand-written: icon, sr-only label, input.
// What differed between them was only the id, type, autoComplete, minLength,
// placeholder, label text, icon and value/onChange pair -- every one of them a
// pass-through prop here.
//
// That hand-writing had already drifted. Two of the eight omitted `group` on
// their wrapper, so `group-focus-within:` on the icon did nothing and the field
// icon never lit up on focus on /forgot-password and /reset-password. One
// component cannot drift that way again.

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
}: AuthFieldProps) {
  return (
    // `group` is what lets the icon react to focus on this field specifically.
    // Two of the eight fields were missing it.
    <div className="relative group">
      <Icon className={AUTH_INPUT_ICON_CLASS} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="kin-input kin-input-affix py-3.5"
      />
    </div>
  );
}

// The form-level error, identical in all four forms.
export function AuthError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-xs text-danger bg-accent-hover/10 border-accent/20 rounded-sheet px-3 py-2">
      {message}
    </p>
  );
}

// The submit button, with its loading spinner. Not the shared SubmitButton: that
// reads useFormStatus and renders an sr-only live region, and these four pages
// drive their own `loading` state from a client handler.
export function AuthSubmit({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
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
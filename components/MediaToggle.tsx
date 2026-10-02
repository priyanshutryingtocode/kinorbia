"use client";

import { useCallback, useState, type ComponentType, type SVGProps } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useSignInGuard } from "@/lib/useSignInGuard";

type MediaToggleMessages = {
  signIn: string;
  error: string;
  added: string;
  removed?: string;
};

type UseMediaToggleOptions = {
  endpoint: string;
  payload: Record<string, unknown>;
  messages: MediaToggleMessages;
  initialActive: boolean;
  // Omit for create-only endpoints: the button locks once active, so the
  // response body is never read and never needs to parse.
  readActive?: (data: unknown) => boolean;
  lockWhenActive?: boolean;
};

export function useMediaToggle({
  endpoint,
  payload,
  messages,
  initialActive,
  readActive,
  lockWhenActive = false,
}: UseMediaToggleOptions) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const signInGuard = useSignInGuard();

  const locked = lockWhenActive && active;

  const toggle = useCallback(async () => {
    if (locked) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (signInGuard(res, messages.signIn)) {
        return;
      }

      if (!res.ok) {
        showToast(messages.error, "error");
        return;
      }

      const next = readActive ? readActive(await res.json()) : true;
      setActive(next);
      showToast(next ? messages.added : (messages.removed ?? messages.added), "success");
      router.refresh();
    } catch {
      showToast(messages.error, "error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, locked, messages, payload, readActive, router, showToast, signInGuard]);

  return { active, loading, locked, toggle };
}

type MediaToggleButtonProps = {
  active: boolean;
  loading: boolean;
  disabled?: boolean;
  activeClassName: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  activeIcon?: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  activeIconClassName?: string;
  label: string;
  onClick: () => void;
};

export function MediaToggleButton({
  active,
  loading,
  disabled,
  activeClassName,
  icon: Icon,
  activeIcon: ActiveIcon,
  activeIconClassName,
  label,
  onClick,
}: MediaToggleButtonProps) {
  const usesActiveIcon = active && Boolean(ActiveIcon);
  const Glyph = usesActiveIcon ? ActiveIcon! : Icon;
  const glyphClassName = usesActiveIcon
    ? (activeIconClassName ?? "")
    : `h-5 w-5 transition-transform group-active:scale-75${active ? " fill-current" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`kin-focus flex h-11 w-11 items-center justify-center rounded-full border transition-all group ${
        active
          ? activeClassName
          : "border-rule bg-glass-strong text-content hover:bg-glass-strong"
      }`}
      aria-label={label}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Glyph className={glyphClassName} />
      )}
    </button>
  );
}

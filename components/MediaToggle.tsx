"use client";

import { useCallback, useState, type ComponentType, type SVGProps } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

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

      if (res.status === 401) {
        showToast(messages.signIn, "info");
        router.push("/login");
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
  }, [endpoint, locked, messages, payload, readActive, router, showToast]);

  return { active, loading, locked, toggle };
}

type MediaToggleButtonProps = {
  active: boolean;
  loading: boolean;
  disabled?: boolean;
  activeClassName: string;
  idleClassName?: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  activeIcon?: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  iconClassName?: string;
  activeIconClassName?: string;
  label: string;
  onClick: () => void;
};

export function MediaToggleButton({
  active,
  loading,
  disabled,
  activeClassName,
  idleClassName = "border-white/10 bg-white/7 text-white hover:bg-white/12",
  icon: Icon,
  activeIcon: ActiveIcon,
  iconClassName = "h-5 w-5 transition-transform group-active:scale-75",
  activeIconClassName,
  label,
  onClick,
}: MediaToggleButtonProps) {
  const usesActiveIcon = active && Boolean(ActiveIcon);
  const Glyph = usesActiveIcon ? ActiveIcon! : Icon;
  const glyphClassName = usesActiveIcon
    ? (activeIconClassName ?? "")
    : `${iconClassName}${active ? " fill-current" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`kin-focus flex h-11 w-11 items-center justify-center rounded-full border transition-all group ${
        active ? activeClassName : idleClassName
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

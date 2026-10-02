"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

type AccessibleDialogProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
  // Replaces the panel's entire styling string rather than appending to it.
  // Needed by a caller that wants a different `width` and `padding`: `w-full`
  // and `w-[…]` are the same specificity, and so are `p-6` and `p-0`, so
  // appending cannot win -- Tailwind resolves equal-specificity utilities by
  // their order in the stylesheet, not by where they sit in the class string.
  // The structural and ARIA attributes are never part of this string, so a
  // replacement still gets a focusable role="dialog" panel.
  panelClassName?: string;
};

const DIALOG_PANEL_CLASS =
  "shell-panel-enter relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-overlay border border-rule bg-canvas p-6 shadow-2xl focus:outline-none";

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
  );
}

export default function AccessibleDialog({
  open,
  onClose,
  titleId,
  children,
  className = "max-w-md",
  panelClassName,
}: AccessibleDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current ? getFocusableElements(panelRef.current) : [];
    (focusable[0] ?? panelRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const elements = getFocusableElements(panelRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!elements.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="shell-overlay p-4">
      <div className="absolute inset-0 bg-scrim/85 backdrop-blur-sm" aria-hidden="true" onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={panelClassName ?? `${DIALOG_PANEL_CLASS} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

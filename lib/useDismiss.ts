"use client";

import { useEffect, type RefObject } from "react";


type UseDismissOptions = {
  open: boolean;
  onDismiss: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  insideRefs?: RefObject<HTMLElement | null>[];
  dismissOnPointerDownOutside?: boolean;
};

export function useDismiss({
  open,
  onDismiss,
  returnFocusRef,
  insideRefs = [],
  dismissOnPointerDownOutside = true,
}: UseDismissOptions) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const stillInside = insideRefs.some((ref) => ref.current?.contains(target));
      if (!stillInside) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
        returnFocusRef?.current?.focus();
      }
    }

    if (dismissOnPointerDownOutside) {
      document.addEventListener("pointerdown", handlePointerDown);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (dismissOnPointerDownOutside) {
        document.removeEventListener("pointerdown", handlePointerDown);
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
    // `insideRefs` is a fresh array at each render, so it is spread into the
    // dep list rather than compared by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss, dismissOnPointerDownOutside, returnFocusRef, ...insideRefs]);
}
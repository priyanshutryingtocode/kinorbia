"use client";

import { useEffect, type RefObject } from "react";

// Escape-to-close, plus optional click-outside, plus returning focus to whatever
// opened the surface. This was written three times by hand -- twice in Navbar
// and once in NotificationBell -- and it is the kind of behaviour that must be
// identical everywhere, because getting it subtly wrong is what leaves a
// keyboard user stranded outside a menu with no way back.

type UseDismissOptions = {
  open: boolean;
  onDismiss: () => void;
  // Where focus goes when Escape closes the surface. Omit for surfaces that
  // should not steal focus back, such as the mobile nav panel whose trigger is
  // itself hidden while it is open.
  returnFocusRef?: RefObject<HTMLElement | null>;
  // A pointer press inside any of these counts as "still open". An array
  // because a portalled surface is not one element: NotificationBell's panel is
  // rendered into a portal, so its trigger and its panel are separate refs and
  // a press on either must not dismiss it.
  insideRefs?: RefObject<HTMLElement | null>[];
  // Off for the mobile nav panel, which is dismissed by Escape and by choosing a
  // destination rather than by pressing outside it.
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
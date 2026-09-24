"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      data-back-to-top
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
      className="back-to-top kin-focus flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface/90 text-content-muted shadow-lg backdrop-blur transition hover:border-accent/40 hover:text-content"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

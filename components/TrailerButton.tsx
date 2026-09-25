"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

type TrailerButtonProps = {
  videoKey: string;
  title: string;
};

export default function TrailerButton({ videoKey, title }: TrailerButtonProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), iframe'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        closeRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kin-focus group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-red-300 transition-all hover:border-accent/60 hover:bg-accent/20 hover:text-content"
        aria-label={`Play trailer for ${title}`}
      >
        <Play className="h-5 w-5 fill-current transition-transform group-active:scale-75" aria-hidden="true" />
      </button>

      {open && (
        <div className="shell-overlay p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={`${title} trailer`}>
          <button className="absolute inset-0 bg-black/90 backdrop-blur-md" type="button" onClick={() => setOpen(false)} tabIndex={-1} aria-hidden="true" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-120 w-120 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]" aria-hidden="true" />

          <div ref={panelRef} tabIndex={-1} className="shell-panel-enter relative w-[min(94vw,calc((100dvh-8.5rem)*16/9))] focus:outline-none">
            <div className="rounded-overlay border border-rule bg-canvas/90 p-3 shadow-float backdrop-blur-xl sm:p-4">
              <div className="flex items-center justify-between gap-4 px-1 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent/20 bg-accent/10 text-red-300">
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="kin-overline text-red-400">Trailer</p>
                    <p className="truncate text-sm font-bold text-content">{title}</p>
                  </div>
                </div>

                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="kin-focus shrink-0 rounded-control border border-rule bg-white/5 p-2 text-content-muted transition hover:bg-white/10 hover:text-content"
                  aria-label="Close trailer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="h-px bg-linear-to-r from-transparent via-accent/50 to-transparent" aria-hidden="true" />

              <div className="mt-3 aspect-video w-full overflow-hidden rounded-control border border-rule bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0&modestbranding=1`}
                  title={`${title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>

              <p className="pt-3 text-right text-[10px] font-bold uppercase tracking-widest text-content-subtle">Esc to close</p>
              <span tabIndex={0} aria-hidden="true" className="sr-only" onFocus={() => closeRef.current?.focus()} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

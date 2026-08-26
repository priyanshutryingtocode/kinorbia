"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

type TrailerButtonProps = {
  videoKey: string;
  title: string;
};

export default function TrailerButton({ videoKey, title }: TrailerButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kin-focus group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300 transition-all hover:border-red-500/60 hover:bg-red-500/20 hover:text-white"
        aria-label={`Play trailer for ${title}`}
      >
        <Play className="h-5 w-5 fill-current transition-transform group-active:scale-75" />
      </button>

      {open && (
        <div
          className="trailer-backdrop fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} trailer`}
        >
          {/* Backdrop surface + click-to-close layer */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          {/* Ambient red glow behind the panel, echoing the login orb */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-120 w-120 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/20 blur-[120px]" />

          {/* Largest 16:9 frame that fits the viewport minus the themed
              chrome (title bar, divider, hint) and modal padding. */}
          <div className="trailer-panel relative w-[min(94vw,calc((100svh-8.5rem)*16/9))]">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/85 p-3 shadow-[0_40px_120px_-40px_rgba(0,0,0,1),0_0_90px_-30px_rgba(220,38,38,0.5)] backdrop-blur-xl sm:p-4">
              <div className="flex items-center justify-between gap-4 px-1 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/12 text-red-300 shadow-[0_0_28px_rgba(220,38,38,0.12)]">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                      Trailer
                    </p>
                    <p className="truncate text-sm font-bold text-white">{title}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="kin-focus shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close trailer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-px bg-linear-to-r from-transparent via-red-500/50 to-transparent" />

              {/* Unmounting this block also stops playback and audio. */}
              <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0&modestbranding=1`}
                  title={`${title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>

              <p className="pt-3 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                Esc to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

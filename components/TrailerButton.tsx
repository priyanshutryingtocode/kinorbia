"use client";

import { useId, useState } from "react";
import { Play, X } from "lucide-react";
import AccessibleDialog from "@/components/AccessibleDialog";

// The panel used to carry its own focus trap, Escape handling, scroll lock and
// focus restore -- all of which `AccessibleDialog` already does. It was also a
// worse copy of them: it queried only `button, iframe` with no visibility
// filter, so Tab could land on an invisible element, and it had no "focus is
// outside the dialog" guard. That missing guard is why it needed a `focusin`
// handler to yank focus back to the close button, which in turn needed a
// focusable `aria-hidden` element as a parking spot -- an ARIA violation that
// existed only as a workaround. Using the shared dialog removes all three.
export default function TrailerButton({
  videoKey,
  title,
}: {
  videoKey: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

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

      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        panelClassName="shell-panel-enter relative w-[min(94vw,calc((100dvh-8.5rem)*16/9))] focus:outline-none"
      >
        {/* Was positioned against the viewport overlay. Inside the panel it is
            visually near-identical, because the panel is itself centred. */}
        <div
          className="pointer-events-none absolute -inset-x-24 -inset-y-24 rounded-full bg-accent/20 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative rounded-overlay border border-rule bg-canvas/90 p-3 shadow-float backdrop-blur-xl sm:p-4">
          <div className="flex items-center justify-between gap-4 px-1 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent/20 bg-accent/10 text-red-300">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="kin-overline text-red-400">Trailer</p>
                <p id={titleId} className="truncate text-sm font-bold text-content">
                  {title}
                </p>
              </div>
            </div>

            {/* First focusable inside the panel, which is where the dialog's
                initial focus lands. Previously an explicit ref. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="kin-focus shrink-0 rounded-control border border-rule bg-surface p-2 text-content-muted transition hover:bg-surface-raised hover:text-content"
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

          <p className="pt-3 text-right text-[10px] font-bold uppercase tracking-widest text-content-subtle">
            Esc to close
          </p>
        </div>
      </AccessibleDialog>
    </>
  );
}
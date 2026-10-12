import Link from "next/link";
import { Film } from "lucide-react";
import type { ReactNode } from "react";
import AuthOrb from "@/components/AuthOrb";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative grid min-h-svh w-dvw place-items-center overflow-hidden bg-canvas p-6 lg:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
      >
        <div className="aspect-square w-[min(44rem,92vw,92svh)]">
          <AuthOrb />
        </div>
      </div>
      {/* The orb is a set of hard strokes, so the card sat on top of it and read
          as a rectangle pasted over a drawing. This sits between them and softens
          the ground directly behind the card, so the strokes fade out where the
          text is and the panel appears to be sitting inside the drawing rather
          than over it. --overlay-surface is itself slightly translucent, so this
          is a second, much wider falloff rather than a hard mask. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[34rem] max-w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--canvas)_0%,transparent_70%)] opacity-70"
      />
      {/* Width only. Every size inside the card -- type scale, padding, field height,
          gap -- is untouched by this change and is set by the components below
          rather than here, so the panel can be resized without any of them moving.

          The inner column stays max-w-64 (256px) and is centred, so a wider card
          buys margin around the form rather than wider fields. That is deliberate:
          widening the column too would start pushing the subline onto its own line
          at some point, and the fields are already 43px tall with 13px text. */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <Link
          href="/"
          className="kin-focus group mb-5 flex items-center gap-2 transition-transform hover:scale-105"
        >
          {/* 24px, matching the largest text inside the card now. It was 32px, then
              28px; at 24px it is still clearly the app's front-door wordmark but
              stops competing with the form for height. */}
          <Film className="h-6 w-6 text-accent-hover" strokeWidth={1.75} />
          <span className="font-display text-[1.5rem] leading-none font-medium tracking-tight text-content">
            Kin<span className="text-wordmark">Orbia</span>
          </span>
        </Link>
        {/* p-5 / lg:p-6, down from p-6 / lg:p-7. This card is shared by all five auth
            pages and the fields below it grew a label and a hint each, so the
            panel needed to give that height back: reset-password is three fields
            plus a confirm and was the tallest of the five.

            `max-h` and `overflow-y-auto` stay as a floor. The padding was reduced
            rather than the content, and the reveal toggle still needs room at this
            width. */}
        <div className="relative flex max-h-[calc(100svh-8rem)] w-full flex-col overflow-y-auto rounded-overlay border border-overlay-border bg-overlay-surface p-5 shadow-float backdrop-blur-md lg:p-6">
          {/* A one-pixel highlight along the top edge. The card is lit from above,
              and without it the top border is the same weight as the bottom one,
              which is what makes a floating panel read as a flat rectangle. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[color-mix(in_srgb,var(--content)_14%,transparent)] to-transparent"
          />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}
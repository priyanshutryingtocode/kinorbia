import Link from "next/link";
import { Film } from "lucide-react";
import type { ReactNode } from "react";
import AuthOrb from "@/components/AuthOrb";

// The two auth pages are the only full-bleed screens in the app: the orb and the
// card replace the normal header, footer, and page container, so neither page
// lives in the (root) group.
//
// The orb is a flat wireframe drawn as SVG, full-bleed behind a centred card.
// It used to be a lit sphere the form sat inside, on the ink ramp in both themes.
// Both of those went: the lighting could not be made to work with
// `radial-gradient`'s corner-relative sizing, and holding the card dark in the
// light theme made it an island that matched nothing else in the app.
//
// Everything here is a theme token, so the page is correct in both themes
// without a second palette -- which is what the previous version could not say.
type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    // Centring has to escape the scrollbar gutter, and it took three attempts to get
    // right. Recorded here so the next person does not re-derive it:
    //
    // `scrollbar-gutter: stable` on <html> (globals.css) reserves the scrollbar
    // width on the RIGHT of the content box. This element fills body, so with
    // `w-full` it was 762px wide inside a 777px viewport and the card sat 7.5px
    // left of the true centre.
    //
    // Attempt 1, `scrollbar-gutter: auto` here: no effect. The property is not
    // inherited and only applies to scroll containers; this element has
    // `overflow-hidden` and therefore no scrollbar.
    //
    // Attempt 2, full viewport width with a compensating negative margin-left: also
    // no effect. The two errors cancel exactly -- the wider box is shifted left by
    // half the gutter it just gained, landing back on 381px. It looked plausible
    // and was wrong. (Described in words rather than written as a literal class,
    // because Tailwind scans raw text and would keep generating the rule.)
    //
    // What works is `w-[100dvw]` alone, no margin. The gutter is reserved on the
    // right, so this element already begins at x=0; giving it the full viewport
    // width puts its centre exactly on the true centre. Zero magic, and it
    // collapses to the same thing on mobile where the gutter is a 0-width
    // overlay. `overflow-hidden` on this same element contains the overhang.
    <div className="relative grid min-h-svh w-[100dvw] place-items-center overflow-hidden bg-canvas p-6 lg:p-10">
      {/* Full-bleed behind the card, faint enough that the form stays the focus:
          the strokes are --rule and --content-subtle, not solid colours.

          Sized against the *smaller* of width and height. It was previously
          `min(46rem, 120vw)`, which scaled on width only, so on a short viewport
          the dashed ring reached 105% of the viewport height and the circle was
          sliced top and bottom. That read as an accident rather than a crop.
          `svh` rather than `vh` so mobile browser chrome cannot reintroduce it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
      >
        <div className="aspect-square w-[min(44rem,92vw,92svh)]">
          <AuthOrb />
        </div>
      </div>

      {/* max-w-sm (384px) rather than max-w-md, with the pages' inner column at
          max-w-64 (256px). The two move together on purpose: narrowing the card
          alone would leave a 20px gap beside 32px of padding, which reads
          cramped. At these values the gap is 32px -- square against the padding,
          which is what makes it read as deliberate rather than as slack. The
          previous pair was 448px and 280px, giving a 52px gap, 1.62x the
          padding.

          The card is a plain block box, so that "gap" is only realised by the
          pages' inner column carrying `mx-auto`. It did not, and a clamped
          block child sits flush left: 32px of visible padding on the left
          against 64px on the right, which read as the form being off-centre.
          `mx-auto` is a no-op on narrow viewports where 256px already fills the
          content box. */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <Link
          href="/"
          className="group mb-6 flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Film className="h-8 w-8 text-accent-hover" />
          <span className="text-3xl font-bold text-content">
            Kin<span className="text-wordmark">Orbia</span>
          </span>
        </Link>

        {/* Opaque rather than /85. The card's separation from the page is set by
            its fill, not by its alpha: over the lightened body, /85 measures
            1.091:1 and /100 only 1.108:1, so the alpha was buying almost nothing.
            1.108 is the same ratio every ordinary card in the app sits at, and
            the border plus shadow-float carry the edge from there. The backdrop
            blur stays, which is what the glass effect actually needs. */}
        <div className="w-full rounded-overlay border border-rule bg-surface-raised p-7 shadow-float backdrop-blur-md lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
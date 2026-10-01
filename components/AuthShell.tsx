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
    // `scrollbar-gutter: stable` on <html> reserves the scrollbar width on every
    // page, so `place-items-center` centred the card in a box ~15px narrower than
    // the visible page and it sat right of the optical centre by that much. The
    // gutter is declared on <html> and this element is the page root, so resetting
    // it to `auto` here restores full width for centring without touching the
    // other 17 routes. Scoped deliberately: on a short viewport where the card
    // does overflow, the scrollbar appearing will shift this layout by its width.
    <div className="relative grid min-h-svh w-full place-items-center overflow-hidden bg-canvas p-6 [scrollbar-gutter:auto] lg:p-10">
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Link
          href="/"
          className="group mb-6 flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Film className="h-8 w-8 text-accent-hover" />
          <span className="text-3xl font-bold text-content">
            Kin<span className="text-highlight">Orbia</span>
          </span>
        </Link>

        {/* Opaque enough to read against the orb lines behind it, blurred so the
            strokes soften as they pass under rather than competing. */}
        <div className="w-full rounded-overlay border border-rule bg-surface-raised/85 p-7 shadow-float backdrop-blur-md lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
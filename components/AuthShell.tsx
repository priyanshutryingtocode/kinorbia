import Link from "next/link";
import { Film } from "lucide-react";
import type { ReactNode } from "react";

// The two auth pages are the only full-bleed screens in the app: the orb and the
// panel replace the normal header, footer, and page container, so neither page
// lives in the (root) group.
//
// The orb is a brand element *beside* the form on wide screens and a backdrop
// *behind* it on narrow ones. It used to be a plate the form sat inside: a
// 280px column dropped into a 520px circle has 438px of vertical room and the
// login content is ~400px tall, so nothing overflowed but the corners sat a few
// pixels from the curve. That reads as pressed-against-the-edge rather than
// obviously broken, which is why it survived review. The `size` prop that let
// signup ask for a 600px orb went with it -- once the orb no longer has to fit
// the form, there is nothing to size it around.
//
// One orb element, not two: the responsive classes move and rescale it, so the
// gradients and the animation are never duplicated.
type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative grid min-h-svh w-full place-items-center overflow-hidden bg-canvas p-6 lg:grid-cols-[1fr_26rem] lg:items-center lg:gap-20 lg:p-10">
      {/* The wash behind everything. Decorative, so it is hidden from the tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-200 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orb-halo opacity-50 blur-3xl"
      />

      {/*
        Absolutely positioned on narrow screens so it sits behind the panel, and
        a real grid cell in column 1 from lg up. `translate-x-0 translate-y-0`
        is what lets the same element be centred by its own edges on mobile and
        laid out by the grid on desktop.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 z-0 w-88 -translate-x-1/2 -translate-y-1/2 opacity-80 lg:static lg:col-start-1 lg:row-start-1 lg:mx-auto lg:w-120 lg:translate-x-0 lg:translate-y-0 lg:opacity-100"
      >
        {/* The halo breathes, and it sits behind the disc rather than on it.
            Scaling the disc itself would grow it ~15px per side while the
            `inset-1` shading stayed put, exposing a ring of flat bg-ink around
            the sphere -- the exact flat edge the lighting exists to remove. */}
        <div className="absolute inset-0 rounded-full bg-accent/25 blur-[90px] animate-orb-bloom motion-reduce:animate-none" />
        {/* Silhouette, plus the tight glow. Static, so the shading stays aligned. */}
        <div className="absolute inset-0 rounded-full bg-ink shadow-[0_0_100px_-20px_rgba(220,38,38,0.55)]" />
        {/* The swirl turns, the shading does not. See the two classes in
            globals.css for why that split is the whole trick. */}
        <div className="absolute inset-1 rounded-full orb-swirl overflow-hidden" />
        <div className="absolute inset-1 rounded-full orb-shading" />
        <div className="absolute inset-0 rounded-full shadow-orb-rim border border-ink-rule" />
      </div>

      {/* Column 2 on lg, and the same column as the orb below that. The panel
          keeps the ink ramp in both themes, so the surrounding `ink-*` text on
          the auth pages stays correct without a second set of tokens. */}
      <div className="relative z-10 col-start-1 row-start-1 flex w-full max-w-md flex-col items-center lg:col-start-2 lg:row-start-1 lg:max-w-none">
        <Link
          href="/"
          className="group mb-7 flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Film className="h-8 w-8 text-accent-hover" />
          <span className="text-3xl font-bold text-ink-content">
            Kin<span className="text-accent-bright">Orbia</span>
          </span>
        </Link>

        <div className="w-full rounded-overlay border border-ink-rule bg-ink-raised/80 p-7 backdrop-blur-sm lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
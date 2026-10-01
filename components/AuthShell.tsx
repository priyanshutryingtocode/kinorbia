import Link from "next/link";
import { Film } from "lucide-react";
import type { ReactNode } from "react";

// The two auth pages are the only full-bleed screens in the app: the orb
// behind the form replaces the normal header, footer, and page container, so
// neither page lives in the (root) group. Everything from the backdrop glow to
// the wordmark was duplicated verbatim, which is what let the two copies drift
// apart on the orb's max-width.
//
// The geometry is a prop rather than a decision made here. Signup carries a
// third field and a taller success panel, so it asks for a wider orb; login
// keeps the narrower one. If they should match, change the two call sites
// rather than hiding the difference inside this component.
type AuthShellProps = {
  children: ReactNode;
  size?: "default" | "tall";
};

export default function AuthShell({ children, size = "default" }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-orb-halo rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div
        className={
          size === "tall"
            ? "relative w-full max-w-150 aspect-square mt-8"
            : "relative w-full max-w-130 aspect-square"
        }
      >
        <div className="absolute inset-0 rounded-full shadow-[0_0_100px_-20px_rgba(220,38,38,0.3)] bg-canvas" />
        <div className="absolute inset-1 rounded-full orb-plasma overflow-hidden opacity-80" />
        <div className="absolute inset-0 rounded-full shadow-orb-rim border border-glass-line" />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center backdrop-blur-sm rounded-full">
          <Link
            href="/"
            className="flex items-center gap-2 group mb-6 hover:scale-105 transition-transform"
          >
            <Film className="w-8 h-8 text-accent-hover" />
            <span className="text-3xl font-bold text-content">
              Kin<span className="text-accent-hover">Orbia</span>
            </span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-136 w-136 max-w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--canvas)_0%,transparent_70%)] opacity-70"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <Link
          href="/"
          className="kin-focus group mb-5 flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Film className="h-6 w-6 text-accent-hover" strokeWidth={1.75} />
          <span className="font-display text-[1.5rem] leading-none font-medium tracking-tight text-content">
            Kin<span className="text-wordmark">Orbia</span>
          </span>
        </Link>
        <div className="relative flex max-h-[calc(100svh-8rem)] w-full flex-col overflow-y-auto rounded-overlay border border-overlay-border bg-overlay-surface p-5 shadow-float backdrop-blur-md lg:p-6">
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
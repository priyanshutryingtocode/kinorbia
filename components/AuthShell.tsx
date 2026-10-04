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
        <div className="w-full rounded-overlay border border-rule bg-surface-raised p-7 shadow-float backdrop-blur-md lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
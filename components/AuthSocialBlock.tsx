"use client";

import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

export default function AuthSocialBlock({ verb }: { verb: string }) {
  return (
    <div className="space-y-3.5">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="kin-focus group flex w-full items-center justify-center gap-3 rounded-control border border-rule bg-glass px-4 py-3 transition-colors duration-150 hover:border-rule-strong hover:bg-glass-hover"
      >
        <Chrome className="h-4.5 w-4.5 text-content-muted transition-colors group-hover:text-content" aria-hidden="true" />
        <span className="text-[13px] font-medium text-content transition-colors">
          {verb} with Google
        </span>
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-rule-strong to-transparent" />
        <span className="kin-overline text-[10px] text-content-subtle">Or</span>
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-rule-strong to-transparent" />
      </div>
    </div>
  );
}
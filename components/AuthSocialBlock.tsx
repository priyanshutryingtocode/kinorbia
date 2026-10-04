"use client";

import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

export default function AuthSocialBlock({ verb }: { verb: string }) {
  return (
    <div className="space-y-3.5">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-3 bg-glass hover:bg-glass-hover border border-rule rounded-control py-3.5 px-4 transition-colors duration-150 group"
      >
        <Chrome className="w-5 h-5 text-content-muted group-hover:text-content transition-colors" />
        <span className="text-sm font-medium text-content group-hover:text-content transition-colors">
          {verb} with Google
        </span>
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px bg-linear-to-r from-transparent via-rule to-transparent flex-1" />
        <span className="text-content-subtle text-[10px] font-bold uppercase tracking-widest">Or</span>
        <div className="h-px bg-linear-to-r from-transparent via-rule to-transparent flex-1" />
      </div>
    </div>
  );
}
"use client";

import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

// Login and signup both open with the same social button and the same "or use a
// form" rule. The two copies differed only in the button's label, which is why
// the divider's class string existed four times across two files -- the same
// shape that let the tab-bar copies drift apart.
//
// `verb` is the whole of the difference: "Continue" reads as "Continue with
// Google", "Sign up" as "Sign up with Google".
export default function AuthSocialBlock({ verb }: { verb: string }) {
  return (
    <>
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

      <div className="flex items-center gap-4 my-2">
        <div className="h-px bg-linear-to-r from-transparent via-rule to-transparent flex-1" />
        <span className="text-content-subtle text-[10px] font-bold uppercase tracking-widest">Or</span>
        <div className="h-px bg-linear-to-r from-transparent via-rule to-transparent flex-1" />
      </div>
    </>
  );
}
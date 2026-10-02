"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

// The 401 arm of a mutation, which is always the same three lines: tell the
// reader they need an account, send them to sign in, and stop.
//
// This was written by hand in MediaToggle, MovieRatingControl and
// ProfileVerifyBanner. It matters to have one copy because the failure mode is
// silent -- a site that forgets the `return` goes on to render the error toast
// as well, so the reader gets two messages and lands on /login anyway.
export function useSignInGuard() {
  const router = useRouter();
  const { showToast } = useToast();

  return useCallback(
    (res: Response, message: string) => {
      if (res.status !== 401) {
        return false;
      }

      showToast(message, "info");
      router.push("/login");
      return true;
    },
    [router, showToast]
  );
}

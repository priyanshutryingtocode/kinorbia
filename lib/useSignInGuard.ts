"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

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

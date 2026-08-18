"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function RetryButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();

  const retry = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <button
      type="button"
      onClick={retry}
      className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/12"
    >
      {label}
    </button>
  );
}

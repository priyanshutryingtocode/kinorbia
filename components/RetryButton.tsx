"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function RetryButton() {
  const router = useRouter();

  const retry = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <button
      type="button"
      onClick={retry}
      className="rounded-full border border-rule bg-glass-strong px-4 py-2 text-sm font-medium text-content transition hover:bg-glass-strong"
    >
      Refresh
    </button>
  );
}

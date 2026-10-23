"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShareActivityToggle({
  initialShare,
  onAnswered,
}: {
  initialShare: boolean;
  onAnswered?: (share: boolean) => void;
}) {
  const router = useRouter();
  const [share, setShare] = useState(initialShare);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: boolean) {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/profile/share", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: next }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data?.message ?? "Could not save that preference.");
        return;
      }

      setShare(next);
      setMessage(data?.message ?? null);
      onAnswered?.(next);
      router.refresh();
    } catch {
      setMessage("Could not save that preference.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-content">
            Share what I watch with people who follow me
          </p>
          <p className="mt-1 text-sm leading-6 text-content-muted">
            {share
              ? "Titles you mark watched appear in your followers' activity feeds."
              : "Only you can see what you have watched."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={share}
          disabled={pending}
          onClick={() => save(!share)}
          className={`kin-focus relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
            share
              ? "border-transparent bg-accent"
              : "border-rule bg-surface-raised"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-on-accent shadow-float transition-[left] ${
              share ? "left-6" : "left-1 bg-content-subtle"
            }`}
          />
          <span className="sr-only">{share ? "Sharing watch activity" : "Not sharing watch activity"}</span>
        </button>
      </div>

      {message ? (
        <p role="status" className="text-xs leading-5 text-content-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
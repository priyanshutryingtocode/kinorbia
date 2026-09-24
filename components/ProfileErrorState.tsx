"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ProfileErrorState({
  title = "This profile could not be loaded",
  description = "The data may be temporarily unavailable. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[60svh] items-center justify-center px-4 py-20" role="alert">
      <div className="premium-card w-full max-w-lg rounded-panel p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="kin-focus mt-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

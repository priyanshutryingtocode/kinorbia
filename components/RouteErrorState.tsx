"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function RouteErrorState({
  title = "This page could not be loaded",
  description = "The data may be temporarily unavailable. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[55svh] items-center justify-center px-4 py-16" role="alert">
      <div className="profile-masthead w-full max-w-lg p-8">
        <div className="h-px w-10 bg-accent" />
        <AlertTriangle className="mt-6 h-5 w-5 text-red-300" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-medium text-content">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-content-muted">{description}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="kin-focus mt-6 inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

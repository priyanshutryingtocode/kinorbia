"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function ListsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="Lists could not be loaded"
      description="Your collections may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

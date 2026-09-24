"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function JournalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="Your journal could not be loaded"
      description="Your watch history may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

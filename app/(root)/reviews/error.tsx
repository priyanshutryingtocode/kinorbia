"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function ReviewsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="Reviews could not be loaded"
      description="Your reviews may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

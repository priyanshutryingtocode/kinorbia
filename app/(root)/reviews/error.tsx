"use client";

import StatusState from "@/components/StatusState";

export default function ReviewsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusState variant="routeError"
      title="Reviews could not be loaded"
      description="Your reviews may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

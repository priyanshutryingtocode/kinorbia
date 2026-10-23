"use client";

import StatusState from "@/components/StatusState";

export default function MovieDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusState
      variant="routeError"
      title="This film could not be loaded"
      description="The details may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}
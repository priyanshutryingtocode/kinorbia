"use client";

import StatusState from "@/components/StatusState";

export default function ListsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusState variant="routeError"
      title="Lists could not be loaded"
      description="Your collections may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

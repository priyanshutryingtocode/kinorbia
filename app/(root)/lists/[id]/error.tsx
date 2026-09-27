"use client";

import StatusState from "@/components/StatusState";

export default function ListDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusState variant="routeError"
      title="This list could not be loaded"
      description="The collection may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

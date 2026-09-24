"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function ListDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="This list could not be loaded"
      description="The collection may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}

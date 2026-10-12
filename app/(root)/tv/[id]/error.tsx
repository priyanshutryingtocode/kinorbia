"use client";

import StatusState from "@/components/StatusState";

// No error boundary until now, for the same reason the movie route had none: getTvDetails
// throws on any non-404 TMDB problem and also runs inside generateMetadata, so one blip
// reached Next's bare default document instead of the styled retry.
export default function TvDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusState
      variant="routeError"
      title="This show could not be loaded"
      description="The details may be temporarily unavailable. Please try again."
      onRetry={reset}
    />
  );
}
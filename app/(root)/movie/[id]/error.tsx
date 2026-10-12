"use client";

import StatusState from "@/components/StatusState";

// This route had no error boundary, so a TMDB failure reached Next's bare default error
// document. Not hypothetical: getMovieDetails throws on every non-404 problem and also runs
// from generateMetadata. Sibling routes -- reviews, lists, activity -- always had one.
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
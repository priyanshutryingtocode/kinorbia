"use client";

import StatusState from "@/components/StatusState";

// This route has no error boundary of its own, so a TMDB failure reached
// Next's bare default error document. That is not a hypothetical: the details
// fetch throws on every non-404 problem (see getMovieDetails), including a
// network error or a 429/500 from TMDB, and it also runs from generateMetadata.
// Sibling routes -- reviews, lists, activity -- have had a boundary all along,
// which is why this was the odd one out rather than a deliberate choice.
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
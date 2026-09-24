"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState title="The activity feed could not be loaded" onRetry={reset} />;
}

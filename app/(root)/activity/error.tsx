"use client";

import StatusState from "@/components/StatusState";

export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusState variant="routeError" title="The activity feed could not be loaded" onRetry={reset} />;
}

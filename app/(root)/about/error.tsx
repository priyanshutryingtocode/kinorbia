"use client";

import StatusState from "@/components/StatusState";

export default function AboutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusState variant="routeError" title="This page could not be loaded" onRetry={reset} />;
}

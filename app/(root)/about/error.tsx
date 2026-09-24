"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function AboutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState title="This page could not be loaded" onRetry={reset} />;
}

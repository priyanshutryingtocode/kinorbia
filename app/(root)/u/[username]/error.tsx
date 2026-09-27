"use client";

import StatusState from "@/components/StatusState";

export default function PublicProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusState variant="profileError" title="This public profile could not be loaded" onRetry={reset} />;
}

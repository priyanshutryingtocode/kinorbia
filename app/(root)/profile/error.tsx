"use client";

import StatusState from "@/components/StatusState";

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusState variant="profileError" onRetry={reset} />;
}

"use client";

import ProfileErrorState from "@/components/ProfileErrorState";

export default function PublicProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ProfileErrorState title="This public profile could not be loaded" onRetry={reset} />;
}

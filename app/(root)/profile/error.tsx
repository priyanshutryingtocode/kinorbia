"use client";

import ProfileErrorState from "@/components/ProfileErrorState";

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ProfileErrorState onRetry={reset} />;
}

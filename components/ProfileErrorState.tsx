"use client";

import StatusState from "@/components/StatusState";

export default function ProfileErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return <StatusState variant="profileError" title={title} description={description} onRetry={onRetry} />;
}

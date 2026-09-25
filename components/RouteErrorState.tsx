"use client";

import StatusState from "@/components/StatusState";

export default function RouteErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return <StatusState variant="routeError" title={title} description={description} onRetry={onRetry} />;
}

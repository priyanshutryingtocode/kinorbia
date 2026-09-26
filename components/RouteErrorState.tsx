"use client";

import StatusState, { type StatusStateProps } from "@/components/StatusState";

export default function RouteErrorState(props: Omit<StatusStateProps, "variant" | "href" | "action">) {
  return <StatusState variant="routeError" {...props} />;
}

"use client";

import StatusState, { type StatusStateProps } from "@/components/StatusState";

export default function ProfileErrorState(props: Omit<StatusStateProps, "variant" | "href" | "action">) {
  return <StatusState variant="profileError" {...props} />;
}

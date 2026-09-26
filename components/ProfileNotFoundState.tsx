import StatusState, { type StatusStateProps } from "@/components/StatusState";

export default function ProfileNotFoundState(props: Omit<StatusStateProps, "variant" | "onRetry">) {
  return <StatusState variant="profileNotFound" {...props} />;
}

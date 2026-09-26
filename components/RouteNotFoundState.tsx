import StatusState, { type StatusStateProps } from "@/components/StatusState";

export default function RouteNotFoundState(props: Omit<StatusStateProps, "variant" | "onRetry">) {
  return <StatusState variant="routeNotFound" {...props} />;
}

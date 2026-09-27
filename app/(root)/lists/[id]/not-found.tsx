import StatusState from "@/components/StatusState";

export default function NotFound() {
  return (
    <StatusState variant="routeNotFound"
      title="List not found"
      description="This list may have been removed, or you may not have access to it."
      href="/lists"
      action="Back to lists"
    />
  );
}

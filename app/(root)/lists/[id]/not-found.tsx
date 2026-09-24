import RouteNotFoundState from "@/components/RouteNotFoundState";

export default function NotFound() {
  return (
    <RouteNotFoundState
      title="List not found"
      description="This list may have been removed, or you may not have access to it."
      href="/lists"
      action="Back to lists"
    />
  );
}

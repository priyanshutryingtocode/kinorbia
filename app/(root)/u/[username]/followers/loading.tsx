import PeopleSkeleton from "@/components/PeopleSkeleton";
import RouteShell from "@/components/RouteShell";

export default function Loading() {
  return (
    <RouteShell spacing="extended" width="standard">
      <PeopleSkeleton />
    </RouteShell>
  );
}

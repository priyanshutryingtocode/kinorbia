import ProfileSkeleton from "@/components/ProfileSkeleton";
import RouteShell from "@/components/RouteShell";

export default function Loading() {
  return (
    <RouteShell spacing="extended" width="frame">
      <ProfileSkeleton publicProfile />
    </RouteShell>
  );
}

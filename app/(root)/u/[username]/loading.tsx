import ProfileSkeleton from "@/components/ProfileSkeleton";
import RouteShell from "@/components/RouteShell";

// Matches `app/(root)/u/[username]/page.tsx`, for the same reason as the
// private profile's loading file.
export default function Loading() {
  return (
    <RouteShell spacing="extended" width="frame">
      <ProfileSkeleton publicProfile />
    </RouteShell>
  );
}

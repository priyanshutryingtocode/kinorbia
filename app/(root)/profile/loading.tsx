import ProfileSkeleton from "@/components/ProfileSkeleton";
import RouteShell from "@/components/RouteShell";

// Matches `app/(root)/profile/page.tsx`. Returning the bare skeleton left it
// without the shell's vertical padding, so the page visibly jumped down as
// soon as content arrived.
export default function Loading() {
  return (
    <RouteShell spacing="extended" width="frame">
      <ProfileSkeleton />
    </RouteShell>
  );
}

import Skeleton from "@/components/Skeleton";

export default function ProfileSkeleton({ publicProfile = false }: { publicProfile?: boolean }) {
  const statCount = publicProfile ? 5 : 4;
  return (
    <div className="min-h-screen px-4 pb-20 pt-24 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">Loading profile</span>
      <div className="mx-auto max-w-6xl" aria-hidden="true">
        <div className="premium-surface rounded-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <Skeleton className="h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-64 max-w-full" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-3 w-48" />
            </div>
            {!publicProfile && <Skeleton className="h-11 w-40 rounded-full" />}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: statCount }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-card" />
          ))}
        </div>
        {!publicProfile && (
          <div className="mt-8 flex gap-2 overflow-hidden">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3] rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

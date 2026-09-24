import Skeleton from "@/components/Skeleton";
import PageContainer from "@/components/PageContainer";

export default function ProfileSkeleton({ publicProfile = false }: { publicProfile?: boolean }) {
  const statCount = publicProfile ? 3 : 4;
  return (
    <div className="pb-20 pt-6 sm:pt-8" aria-busy="true">
      <span className="sr-only" role="status">Loading profile</span>
      <div aria-hidden="true">
        <PageContainer width="frame">
        <div className="profile-masthead p-5 sm:p-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-64 max-w-full" />
              <Skeleton className="h-3 w-full max-w-xl" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
        <div className={`mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 ${publicProfile ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
          {Array.from({ length: statCount }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-none bg-neutral-950" />
          ))}
        </div>
        {!publicProfile && (
          <div className="mt-6 flex gap-4 overflow-hidden border-b border-white/10">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-16 shrink-0 rounded-none" />
            ))}
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-2/3 rounded-sm" />
          ))}
        </div>
        </PageContainer>
      </div>
    </div>
  );
}

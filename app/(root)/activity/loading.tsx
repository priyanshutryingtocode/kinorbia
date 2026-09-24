import PageContainer from "@/components/PageContainer";
import Skeleton from "@/components/Skeleton";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="bg-canvas pt-6 pb-16 sm:pt-8">
      <PageContainer width="standard">
        <SkeletonRegion label="Loading activity feed">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          </div>

          <div className="mt-6 flex items-stretch gap-2 border-b border-rule">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>

          <div className="kin-editorial-list mt-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="kin-editorial-row gap-4">
                <Skeleton className="h-24 w-16 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

import PageContainer from "@/components/PageContainer";
import Skeleton from "@/components/Skeleton";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="bg-canvas pb-16 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading search">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>

          <div className="mb-6 mt-6 flex gap-4 border-b border-rule">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>

          <div className="kin-panel">
            <Skeleton className="h-12 w-full" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Skeleton className="h-7 w-48" />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-2/3 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

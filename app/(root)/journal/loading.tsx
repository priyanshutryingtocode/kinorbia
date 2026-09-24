import PageContainer from "@/components/PageContainer";
import Skeleton from "@/components/Skeleton";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="bg-canvas pb-16 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading journal">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <Skeleton className="h-[34rem] w-full" />
            <div className="kin-editorial-list">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="kin-editorial-row">
                  <Skeleton className="aspect-2/3 w-16 shrink-0 sm:w-20" />
                  <div className="min-w-0 flex-1 space-y-3 py-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

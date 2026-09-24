import PageContainer from "@/components/PageContainer";
import Skeleton from "@/components/Skeleton";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="bg-canvas pb-16 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading reviews">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <Skeleton className="h-[32rem] w-full" />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex min-w-0 gap-4 rounded-sheet border border-rule bg-surface/65 p-4">
                  <Skeleton className="aspect-2/3 w-20 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-3 py-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
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

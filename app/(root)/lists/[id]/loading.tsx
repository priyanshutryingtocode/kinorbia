import PageContainer from "@/components/PageContainer";
import SkeletonRegion from "@/components/SkeletonRegion";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="pb-20 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading list" className="space-y-8">
          <Skeleton className="h-4 w-28" />
          <div className="border-t border-rule pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-2xl space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-7 w-28 rounded-control" />
            </div>
          </div>
          <div>
            <div className="border-t border-rule pt-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-2 h-4 w-full max-w-md" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-control border border-rule">
                  <Skeleton className="aspect-2/3 w-full rounded-none" />
                  <div className="space-y-2 p-2.5">
                    <Skeleton className="h-4 w-full rounded-control" />
                    <Skeleton className="h-3 w-2/3 rounded-control" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-rule pt-4">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-16 w-full rounded-control" />
              <Skeleton className="h-24 w-full rounded-control" />
            </div>
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

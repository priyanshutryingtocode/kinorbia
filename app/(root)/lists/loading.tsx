import PageContainer from "@/components/PageContainer";
import SkeletonRegion from "@/components/SkeletonRegion";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="pb-20 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading lists" className="space-y-7">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>
          <div className="grid items-start gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="kin-panel space-y-4">
              <div className="border-b border-rule pb-3">
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-control" />
              <Skeleton className="h-20 w-full rounded-control" />
              <Skeleton className="h-40 w-full rounded-control" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10 w-full rounded-control" />
                <Skeleton className="h-10 w-full rounded-control" />
              </div>
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
            <div>
              <div className="border-t border-rule pt-4">
                <Skeleton className="mb-2 h-3 w-28" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="mt-2 h-4 w-full max-w-md" />
              </div>
              <div className="mt-4 divide-y divide-rule border-y border-rule">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-5 py-5 sm:flex-row sm:justify-between">
                    <div className="w-full max-w-xl space-y-3">
                      <Skeleton className="h-5 w-24 rounded-control" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="grid w-full grid-cols-3 gap-2 sm:w-72 sm:grid-cols-4 lg:grid-cols-5">
                      {Array.from({ length: 5 }).map((__, posterIndex) => (
                        <Skeleton key={posterIndex} className="aspect-2/3 rounded-control" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

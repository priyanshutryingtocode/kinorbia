import PageContainer from "@/components/PageContainer";
import Skeleton from "@/components/Skeleton";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="bg-canvas pt-6 pb-16 sm:pt-8">
      <PageContainer width="standard">
        <SkeletonRegion label="Loading about page">
          <div className="border-t border-rule pt-5">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          </div>

          <div className="mt-10 border-t border-rule pt-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-8 w-32" />
            <div className="kin-editorial-list mt-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="kin-editorial-row gap-4 py-6 sm:gap-6">
                  <Skeleton className="h-8 w-14 shrink-0" />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-5 w-full" />
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

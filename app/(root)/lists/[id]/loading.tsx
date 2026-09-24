import PageContainer from "@/components/PageContainer";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="pb-20 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading list" className="space-y-8">
          <div className="kin-skeleton h-4 w-28" />
          <div className="border-t border-rule pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-2xl space-y-3">
                <div className="kin-skeleton h-3 w-20" />
                <div className="kin-skeleton h-10 w-3/4" />
                <div className="kin-skeleton h-4 w-full" />
                <div className="kin-skeleton h-4 w-2/3" />
              </div>
              <div className="kin-skeleton h-7 w-28 rounded-control" />
            </div>
          </div>
          <div>
            <div className="border-t border-rule pt-4">
              <div className="kin-skeleton mb-2 h-3 w-20" />
              <div className="kin-skeleton h-7 w-32" />
              <div className="kin-skeleton mt-2 h-4 w-full max-w-md" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-control border border-rule">
                  <div className="kin-skeleton aspect-2/3 w-full rounded-none" />
                  <div className="space-y-2 p-2.5">
                    <div className="kin-skeleton h-4 w-full rounded-control" />
                    <div className="kin-skeleton h-3 w-2/3 rounded-control" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-rule pt-4">
            <div className="kin-skeleton mb-2 h-3 w-24" />
            <div className="kin-skeleton h-7 w-36" />
            <div className="kin-skeleton mt-2 h-4 w-full max-w-md" />
            <div className="mt-5 space-y-3">
              <div className="kin-skeleton h-16 w-full rounded-control" />
              <div className="kin-skeleton h-24 w-full rounded-control" />
            </div>
          </div>
        </SkeletonRegion>
      </PageContainer>
    </div>
  );
}

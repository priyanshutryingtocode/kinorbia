import PageContainer from "@/components/PageContainer";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function Loading() {
  return (
    <div className="pb-20 pt-6 sm:pt-8">
      <PageContainer width="page">
        <SkeletonRegion label="Loading lists" className="space-y-7">
          <div className="border-t border-rule pt-5">
            <div className="kin-skeleton mb-3 h-3 w-24" />
            <div className="kin-skeleton h-9 w-64 max-w-full" />
            <div className="kin-skeleton mt-3 h-4 w-full max-w-2xl" />
          </div>
          <div className="grid items-start gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="kin-panel space-y-4">
              <div className="border-b border-rule pb-3">
                <div className="kin-skeleton mb-2 h-3 w-20" />
                <div className="kin-skeleton h-5 w-36" />
                <div className="kin-skeleton mt-2 h-4 w-full" />
              </div>
              <div className="kin-skeleton h-10 w-full rounded-control" />
              <div className="kin-skeleton h-20 w-full rounded-control" />
              <div className="kin-skeleton h-40 w-full rounded-control" />
              <div className="grid grid-cols-2 gap-2">
                <div className="kin-skeleton h-10 w-full rounded-control" />
                <div className="kin-skeleton h-10 w-full rounded-control" />
              </div>
              <div className="kin-skeleton h-10 w-full rounded-control" />
            </div>
            <div>
              <div className="border-t border-rule pt-4">
                <div className="kin-skeleton mb-2 h-3 w-28" />
                <div className="kin-skeleton h-7 w-24" />
                <div className="kin-skeleton mt-2 h-4 w-full max-w-md" />
              </div>
              <div className="mt-4 divide-y divide-rule border-y border-rule">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-5 py-5 sm:flex-row sm:justify-between">
                    <div className="w-full max-w-xl space-y-3">
                      <div className="kin-skeleton h-5 w-24 rounded-control" />
                      <div className="kin-skeleton h-6 w-3/4" />
                      <div className="kin-skeleton h-3 w-1/2" />
                      <div className="kin-skeleton h-4 w-full" />
                      <div className="kin-skeleton h-4 w-5/6" />
                    </div>
                    <div className="grid w-full grid-cols-3 gap-2 sm:w-72 sm:grid-cols-4 lg:grid-cols-5">
                      {Array.from({ length: 5 }).map((__, posterIndex) => (
                        <div key={posterIndex} className="kin-skeleton aspect-2/3 rounded-control" />
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

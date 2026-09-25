import Skeleton from "@/components/Skeleton";
import PageContainer from "@/components/PageContainer";
import SkeletonRegion from "@/components/SkeletonRegion";

export default function PeopleSkeleton() {
  return (
    <SkeletonRegion label="Loading people">
      <PageContainer width="standard">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-3 w-28" />
        <Skeleton className="mt-2 h-10 w-64 max-w-full" />
        <Skeleton className="mt-6 h-12 w-full" />
        <div className="mt-5 border-y border-white/10">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-b-0">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-20" />
              </div>
              <Skeleton className="h-7 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      </PageContainer>
    </SkeletonRegion>
  );
}

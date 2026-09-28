import Skeleton from "./Skeleton";
import SkeletonRegion from "./SkeletonRegion";

export default function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading content">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            <Skeleton className="aspect-2/3 w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

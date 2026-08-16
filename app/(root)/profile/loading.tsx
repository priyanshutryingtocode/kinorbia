import Skeleton from "@/components/Skeleton";
import SkeletonGrid from "@/components/SkeletonGrid";

export default function Loading() {
  return (
    <main className="min-h-screen px-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Skeleton className="mb-3 h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <SkeletonGrid count={10} />
      </div>
    </main>
  );
}
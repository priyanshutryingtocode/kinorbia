import SkeletonGrid from "@/components/SkeletonGrid";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen px-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 max-w-3xl">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="mb-3 h-10 w-64" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
        <SkeletonGrid count={10} />
      </div>
    </main>
  );
}
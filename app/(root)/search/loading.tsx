import SkeletonGrid from "@/components/SkeletonGrid";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <Skeleton className="mb-3 h-4 w-16" />
          <Skeleton className="mb-3 h-11 w-72" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </header>
        <SkeletonGrid count={10} />
      </div>
    </div>
  );
}
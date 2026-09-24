import Skeleton from "@/components/Skeleton";

export default function PeopleSkeleton() {
  return (
    <div className="min-h-screen px-4 pb-20 pt-24 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">Loading people</span>
      <div className="mx-auto max-w-6xl" aria-hidden="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-12 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-8 h-20 w-full rounded-card" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

import Skeleton from "./Skeleton";

export default function SkeletonGrid({
  count = 10,
  label = "Loading content",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-busy="true" className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            <Skeleton className="aspect-2/3 w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

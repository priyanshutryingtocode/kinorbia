import Skeleton from "@/components/Skeleton";

export default function RecommendationsSkeleton() {
  return (
    <section className="mb-14 border-b border-white/5 pb-10">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-2/3 w-full rounded-lg" />
        ))}
      </div>
    </section>
  );
}

import Skeleton from "@/components/Skeleton";
import PageContainer from "@/components/PageContainer";

export default function Loading() {
  return (
    <div className="bg-neutral-950 pt-10 pb-16 text-white">
      <PageContainer width="page">
        <header className="mb-10">
          <Skeleton className="mb-3 h-4 w-16" />
          <Skeleton className="mb-3 h-11 w-64" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </header>
        <section className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
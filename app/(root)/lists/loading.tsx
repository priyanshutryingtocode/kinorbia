import Skeleton from "@/components/Skeleton";
import PageContainer from "@/components/PageContainer";

export default function Loading() {
  return (
    <div className="bg-neutral-950 pt-10 pb-16 text-white">
      <PageContainer width="page">
        <header className="mb-10">
          <Skeleton className="mb-3 h-4 w-20" />
          <Skeleton className="mb-3 h-11 w-64" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
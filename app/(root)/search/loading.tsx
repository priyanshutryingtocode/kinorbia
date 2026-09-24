import PageContainer from "@/components/PageContainer";
import SkeletonGrid from "@/components/SkeletonGrid";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="bg-neutral-950 pt-10 pb-16 text-white">
      <PageContainer width="page">
        <header className="mb-10">
          <Skeleton className="mb-3 h-4 w-16" />
          <Skeleton className="mb-3 h-11 w-72" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </header>
        <SkeletonGrid count={10} />
      </PageContainer>
    </div>
  );
}
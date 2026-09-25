import PageContainer from "@/components/PageContainer";
import SkeletonGrid from "@/components/SkeletonGrid";
import Skeleton from "@/components/Skeleton";

export default function BrowseLoading({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="pt-10 pb-16">
      <PageContainer width="page">
        <div className="mb-8 max-w-3xl">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className={`mb-3 h-10 ${titleWidth}`} />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
        <SkeletonGrid count={10} />
      </PageContainer>
    </div>
  );
}

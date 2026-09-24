import PageContainer from "@/components/PageContainer";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="bg-neutral-950" aria-busy="true">
      <PageContainer width="frame" className="flex min-h-[calc(100dvh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" aria-hidden="true" />
          <p className="text-neutral-400 animate-pulse">Loading film...</p>
        </div>
      </PageContainer>
    </div>
  );
}
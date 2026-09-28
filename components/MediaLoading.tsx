import PageContainer from "@/components/PageContainer";
import { Loader2 } from "lucide-react";

export default function MediaLoading({ label }: { label: string }) {
  return (
    <div className="bg-canvas" aria-busy="true">
      <PageContainer width="frame" className="flex min-h-[calc(100dvh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 text-accent-hover animate-spin" aria-hidden="true" />
          <p className="text-content-muted animate-pulse">{label}</p>
        </div>
      </PageContainer>
    </div>
  );
}

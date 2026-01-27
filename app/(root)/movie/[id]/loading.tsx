import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-neutral-400 animate-pulse">Loading film...</p>
      </div>
    </div>
  );
}
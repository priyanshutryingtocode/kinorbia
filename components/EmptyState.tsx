import { Film } from "lucide-react";

export default function EmptyState({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-2 border-y border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center"
          : "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-neutral-900/30 px-6 py-14 text-center"
      }
    >
      <div className={compact ? "p-2" : "p-3 rounded-full bg-white/5"}>
        <Film className={compact ? "h-5 w-5 text-neutral-600" : "h-6 w-6 text-neutral-500"} />
      </div>
      <h3 className={compact ? "text-base font-semibold text-white" : "text-lg font-semibold text-white"}>{title}</h3>
      {description && <p className="max-w-md text-sm text-neutral-400">{description}</p>}
      {children}
    </div>
  );
}

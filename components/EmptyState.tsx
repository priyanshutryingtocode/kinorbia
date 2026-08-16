import { Film } from "lucide-react";

export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-neutral-900/30 px-6 py-14 text-center">
      <div className="p-3 rounded-full bg-white/5">
        <Film className="h-6 w-6 text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="max-w-md text-sm text-neutral-400">{description}</p>}
      {children}
    </div>
  );
}
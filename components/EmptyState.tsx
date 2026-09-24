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
          ? "flex flex-col items-center justify-center gap-2.5 border-y border-rule bg-canvas/40 px-5 py-8 text-center"
          : "flex flex-col items-center justify-center gap-3 rounded-sheet border border-rule bg-surface px-6 py-12 text-center"
      }
    >
      <div
        className={
          compact
            ? "p-1.5 text-content-subtle"
            : "rounded-control bg-surface-raised p-2.5 text-highlight/80"
        }
      >
        <Film className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden="true" />
      </div>
      <h3 className={`${compact ? "text-base" : "text-lg"} font-medium text-content`}>{title}</h3>
      {description && <p className="max-w-md text-sm leading-6 text-content-muted">{description}</p>}
      {children}
    </div>
  );
}

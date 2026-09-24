import type { ReactNode } from "react";
import { Film } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
  icon?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3 | 4;
};

export default function EmptyState({
  title,
  description,
  children,
  compact = false,
  icon,
  className = "",
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";
  const emptyIcon = icon === undefined ? <Film className={compact ? "h-5 w-5" : "h-6 w-6"} /> : icon;

  return (
    <div
      className={`${
        compact
          ? "flex flex-col items-center justify-center gap-2.5 border-y border-rule bg-canvas/40 px-5 py-8 text-center"
          : "flex flex-col items-center justify-center gap-3 rounded-sheet border border-rule bg-surface px-6 py-12 text-center"
      } ${className}`}
    >
      {emptyIcon && (
        <div
          aria-hidden="true"
          className={
            compact
              ? "p-1.5 text-content-subtle"
              : "rounded-control bg-surface-raised p-2.5 text-highlight/80"
          }
        >
          {emptyIcon}
        </div>
      )}
      <Heading className={`font-display font-medium text-content ${compact ? "text-base" : "text-lg"}`}>{title}</Heading>
      {description && <p className="max-w-md text-sm leading-6 text-content-muted">{description}</p>}
      {children}
    </div>
  );
}

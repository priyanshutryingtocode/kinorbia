import type { ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headings = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  headingLevel?: HeadingLevel;
  className?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  id,
  headingLevel = 2,
  className = "",
}: SectionHeaderProps) {
  const Heading = headings[headingLevel];
  const hasTitle = title !== undefined && title !== null;
  const headingId = id && hasTitle ? `${id}-heading` : undefined;

  return (
    <div
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-32 ${className}`}
    >
      <header className="flex flex-col gap-3 border-t border-rule pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="kin-overline mb-1.5 text-highlight/80">{eyebrow}</p>}
          {hasTitle && (
            <Heading id={headingId} className="font-display text-2xl font-medium leading-tight text-content">
              {title}
            </Heading>
          )}
          {description && <div className="mt-2 max-w-2xl text-sm leading-6 text-content-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </div>
  );
}

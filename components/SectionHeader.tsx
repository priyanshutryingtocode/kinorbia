import type { ReactNode } from "react";
import HeaderBlock from "@/components/HeaderBlock";

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
  const headingId = id && title !== undefined && title !== null ? `${id}-heading` : undefined;

  return (
    <div id={id} aria-labelledby={headingId} className={`scroll-mt-32 ${className}`}>
      <header className="border-t border-rule pt-4">
        <HeaderBlock
          eyebrow={eyebrow}
          title={title}
          titleId={headingId}
          titleTag={headings[headingLevel]}
          description={description}
          actions={actions}
          rowClassName="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          textClassName="min-w-0"
          eyebrowClassName="kin-overline mb-1.5 text-highlight/80"
          titleClassName="font-display text-2xl font-medium leading-tight text-content"
          descriptionClassName="mt-2 max-w-2xl text-sm leading-6 text-content-muted"
        />
      </header>
    </div>
  );
}

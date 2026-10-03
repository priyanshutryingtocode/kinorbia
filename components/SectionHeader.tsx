import type { ReactNode } from "react";
import HeaderBlock from "@/components/HeaderBlock";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  id,
  className = "",
}: SectionHeaderProps) {
  const headingId = id && title !== undefined && title !== null ? `${id}-heading` : undefined;

  return (
    <div id={id} aria-labelledby={headingId} className={`scroll-mt-32 ${className}`}>
      <header className="relative border-t border-rule pt-4">
        {/* A short bronze segment sitting on the section's own hairline, so the
            divider carries the editorial hue instead of being flat grey. Same
            shape as the rule StatusState draws above its heading. Decorative: it
            marks a boundary the border already marks, so it is hidden from
            assistive tech rather than being announced as content. */}
        <span aria-hidden="true" className="absolute -top-px left-0 h-px w-12 bg-highlight-muted" />
        <HeaderBlock
          eyebrow={eyebrow}
          title={title}
          titleId={headingId}
          titleTag="h2"
          description={description}
          rowClassName="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          textClassName="min-w-0"
          eyebrowClassName="kin-overline mb-1.5 text-highlight-muted"
          titleClassName="font-display text-2xl font-medium leading-tight text-content"
          descriptionClassName="mt-2 max-w-2xl text-sm leading-6 text-content-muted"
        />
      </header>
    </div>
  );
}

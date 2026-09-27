import type { ReactNode } from "react";
import HeaderBlock, { HEADINGS, type HeadingLevel } from "@/components/HeaderBlock";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: Extract<HeadingLevel, 1 | 2 | 3>;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  headingLevel = 1,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`border-t border-rule pt-5 ${className}`}>
      <HeaderBlock
        eyebrow={eyebrow}
        title={title}
        titleTag={HEADINGS[headingLevel]}
        description={description}
        actions={actions}
        rowClassName="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        textClassName="min-w-0"
        eyebrowClassName="kin-overline mb-2 text-highlight/80"
        titleClassName="font-display text-3xl font-medium leading-editorial text-content sm:text-4xl"
        descriptionClassName="mt-2.5 max-w-2xl text-sm leading-6 text-content-muted"
      />
    </header>
  );
}

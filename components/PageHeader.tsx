import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2 | 3;
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
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";

  return (
    <header className={`border-t border-rule pt-5 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="kin-overline mb-2 text-highlight/80">{eyebrow}</p>}
          <Heading className="font-display text-3xl font-medium leading-editorial text-content sm:text-4xl">
            {title}
          </Heading>
          {description && (
            <div className="mt-2.5 max-w-2xl text-sm leading-6 text-content-muted">{description}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

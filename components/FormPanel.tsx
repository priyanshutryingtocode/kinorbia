import type { ReactNode } from "react";

type HeadingLevel = 2 | 3 | 4;

export type FormPanelProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
  headingLevel?: HeadingLevel;
  className?: string;
};

export default function FormPanel({
  eyebrow,
  title,
  description,
  children,
  id,
  headingLevel = 2,
  className = "",
}: FormPanelProps) {
  const headings = { 2: "h2", 3: "h3", 4: "h4" } as const;
  const Heading = headings[headingLevel];
  const hasTitle = title !== undefined && title !== null;
  const headingId = id && hasTitle ? `${id}-heading` : undefined;
  const hasHeader = Boolean(eyebrow || hasTitle || description);

  return (
    <section id={id} aria-labelledby={headingId} className={`kin-panel ${className}`}>
      {hasHeader && (
        <header className="mb-4 border-b border-rule pb-3">
          {eyebrow && <p className="kin-overline mb-1.5 text-highlight/80">{eyebrow}</p>}
          {hasTitle && (
            <Heading id={headingId} className="font-display text-lg font-medium leading-tight text-content">
              {title}
            </Heading>
          )}
          {description && <div className="mt-2 text-sm leading-6 text-content-muted">{description}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

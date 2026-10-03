import type { ReactNode } from "react";
import HeaderBlock from "@/components/HeaderBlock";

type FormPanelProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
};

export default function FormPanel({
  eyebrow,
  title,
  description,
  children,
  id,
  className = "",
}: FormPanelProps) {
  const hasTitle = title !== undefined && title !== null;
  const headingId = id && hasTitle ? `${id}-heading` : undefined;
  const hasHeader = Boolean(eyebrow || hasTitle || description);

  return (
    <section id={id} aria-labelledby={headingId} className={`kin-panel ${className}`}>
      {hasHeader && (
        <header className="mb-4 border-b border-rule pb-3">
          <HeaderBlock
            eyebrow={eyebrow}
            title={title}
            titleId={headingId}
            titleTag="h2"
            description={description}
            rowClassName=""
            eyebrowClassName="kin-overline mb-1.5 text-highlight-muted"
            titleClassName="font-display text-lg font-medium leading-tight text-content"
            descriptionClassName="mt-2 text-sm leading-6 text-content-muted"
          />
        </header>
      )}
      {children}
    </section>
  );
}

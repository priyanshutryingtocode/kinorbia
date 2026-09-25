import type { ElementType, ReactNode } from "react";

export type HeaderBlockProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  titleId?: string;
  titleTag: ElementType;
  description?: ReactNode;
  actions?: ReactNode;
  rowClassName: string;
  textClassName?: string;
  eyebrowClassName: string;
  titleClassName: string;
  descriptionTag?: ElementType;
  descriptionClassName: string;
  wrapActions?: boolean;
};

export default function HeaderBlock({
  eyebrow,
  title,
  titleId,
  titleTag: Title,
  description,
  actions,
  rowClassName,
  textClassName,
  eyebrowClassName,
  titleClassName,
  descriptionTag: Description = "div",
  descriptionClassName,
  wrapActions = true,
}: HeaderBlockProps) {
  const hasTitle = title !== undefined && title !== null;
  const actionsNode = actions ? (wrapActions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : actions) : null;

  return (
    <div className={rowClassName}>
      <div className={textClassName}>
        {eyebrow && <p className={eyebrowClassName}>{eyebrow}</p>}
        {hasTitle && (
          <Title id={titleId} className={titleClassName}>
            {title}
          </Title>
        )}
        {description && <Description className={descriptionClassName}>{description}</Description>}
      </div>
      {actionsNode}
    </div>
  );
}

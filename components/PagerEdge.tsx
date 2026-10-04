import Link from "next/link";

type PagerEdgeProps = {
  direction: "previous" | "next";
  href?: string;
  className: string;
  disabledClassName: string;
};

export default function PagerEdge({
  direction,
  href,
  className,
  disabledClassName,
}: PagerEdgeProps) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "Previous" : "Next";
  const glyph = isPrevious ? "←" : "→";
  const labelClass = href ? "hidden sm:inline" : "sr-only sm:not-sr-only";
  const glyphNode = <span aria-hidden="true">{glyph}</span>;
  const labelNode = <span className={labelClass}>{label}</span>;
  const content = isPrevious ? (
    <>
      {glyphNode}
      {labelNode}
    </>
  ) : (
    <>
      {labelNode}
      {glyphNode}
    </>
  );

  if (!href) {
    return (
      <span className={disabledClassName} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={`${label} page`}>
      {content}
    </Link>
  );
}

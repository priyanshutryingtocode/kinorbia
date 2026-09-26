import Link from "next/link";

type PagerEdgeProps = {
  direction: "previous" | "next";
  // Omit href to render the disabled state.
  href?: string;
  className: string;
  disabledClassName: string;
};

// Shared by PeopleList and ProfilePagination. Each caller keeps its own class
// constants because they are deliberately not identical.
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
  // Previous renders arrow-then-label; Next renders label-then-arrow.
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

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  // The chevron points outward on both sides: left of Previous, right of Next.
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  const labelClass = href ? "hidden sm:inline" : "sr-only sm:not-sr-only";
  const iconNode = <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  const labelNode = <span className={labelClass}>{label}</span>;
  const content = isPrevious ? (
    <>
      {iconNode}
      {labelNode}
    </>
  ) : (
    <>
      {labelNode}
      {iconNode}
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
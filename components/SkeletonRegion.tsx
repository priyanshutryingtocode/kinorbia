import type { ReactNode } from "react";

export type SkeletonRegionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export default function SkeletonRegion({ label, children, className = "" }: SkeletonRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

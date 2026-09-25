import type { ReactNode } from "react";
import PageContainer from "@/components/PageContainer";

export type RouteShellSpacing = "immersive" | "standard" | "extended";

const spacingClasses: Record<RouteShellSpacing, string> = {
  immersive: "pt-10 pb-16",
  standard: "bg-canvas pb-16 pt-6 sm:pt-8",
  extended: "pb-20 pt-6 sm:pt-8",
};

type RouteShellProps = {
  children: ReactNode;
  spacing?: RouteShellSpacing;
  width?: "page" | "frame" | "standard" | "reading" | "control";
  className?: string;
};

export default function RouteShell({
  children,
  spacing = "standard",
  width = "page",
  className = "",
}: RouteShellProps) {
  return (
    <div className={spacingClasses[spacing]}>
      <PageContainer width={width} className={className}>
        {children}
      </PageContainer>
    </div>
  );
}

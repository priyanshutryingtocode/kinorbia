import type { ReactNode } from "react";

type PageWidth = "page" | "frame" | "standard" | "reading" | "control";

const widthClasses: Record<PageWidth, string> = {
  page: "max-w-page",
  frame: "max-w-frame",
  standard: "max-w-5xl",
  reading: "max-w-reading",
  control: "max-w-control",
};

export default function PageContainer({
  children,
  width = "page",
  className = "",
}: {
  children: ReactNode;
  width?: PageWidth;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 ${widthClasses[width]} ${className}`}>
      {children}
    </div>
  );
}

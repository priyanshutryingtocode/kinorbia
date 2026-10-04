import { Film } from "lucide-react";

export default function PosterFallback({
  alt,
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`flex h-full w-full items-center justify-center bg-surface-raised ${className || ""}`}
    >
      <Film className="h-8 w-8 text-content-subtle" aria-hidden="true" />
    </div>
  );
}
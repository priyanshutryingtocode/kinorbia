"use client";

import Image, { type ImageProps } from "next/image";
import { Film } from "lucide-react";
import { useState } from "react";

type TmdbPosterImageProps = Omit<ImageProps, "src" | "onError" | "unoptimized"> & {
  src: string;
};

export default function TmdbPosterImage({ src, alt, className, ...props }: TmdbPosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex h-full w-full items-center justify-center bg-neutral-900 ${className || ""}`}
      >
        <Film className="h-8 w-8 text-neutral-700" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={className}
      unoptimized
      onError={() => setFailedSrc(src)}
    />
  );
}

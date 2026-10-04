"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import PosterFallback from "@/components/PosterFallback";

type TmdbPosterImageProps = Omit<ImageProps, "src" | "onError" | "unoptimized"> & {
  src: string;
};

export default function TmdbPosterImage({ src, alt, className, ...props }: TmdbPosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <PosterFallback alt={alt || undefined} className={className} />;
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
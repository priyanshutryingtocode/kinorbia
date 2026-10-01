"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import PosterFallback from "@/components/PosterFallback";

type TmdbPosterImageProps = Omit<ImageProps, "src" | "onError" | "unoptimized"> & {
  src: string;
};

// Handles the second of the two ways a poster can fail: the URL resolved, but
// the image did not load. The first -- TMDB returning no poster path at all --
// never reaches this component, and is PosterImage's job. Both render
// `PosterFallback` so a missing poster looks the same either way.
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
"use client";

import Image, { type ImageProps } from "next/image";
import { Film } from "lucide-react";
import { useState } from "react";

type TmdbPosterImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string;
};

export default function TmdbPosterImage({ src, alt, className, ...props }: TmdbPosterImageProps) {
  const [mode, setMode] = useState<"optimized" | "direct" | "fallback">("optimized");

  if (mode === "fallback") {
    return (
      <div
        role="img"
        aria-label={alt}
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
      unoptimized={mode === "direct"}
      onError={() => setMode(mode === "optimized" ? "direct" : "fallback")}
    />
  );
}

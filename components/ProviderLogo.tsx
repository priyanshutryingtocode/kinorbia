"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProviderLogo({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  return (
    <Image
      src={src}
      alt=""
      width={18}
      height={18}
      unoptimized
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
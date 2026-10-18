"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A streaming provider's logo.
 *
 * Takes an already-resolved `src` rather than calling `tmdbImage()` itself. That function
 * reads `process.env.TMDB_IMAGE_URL`, which does not exist in the browser bundle, so a client
 * component calling it would build URLs from a missing env var. The server component resolves
 * the URL and hands it over, which is the split `PosterImage` -> `TmdbPosterImage` already uses.
 *
 * `unoptimized` is not a performance choice. These were the only TMDB images in the app without
 * it, and therefore the only ones whose URL went through the Next image optimizer -- which
 * fetches `image.tmdb.org` server-side. That fetch is rejected from Vercel's infrastructure, so
 * on the deployment every chip rendered as a broken-image glyph while posters, backdrops and
 * cast avatars, all `unoptimized` and fetched by the browser directly, loaded fine.
 *
 * Renders nothing when the URL is missing or the load fails. The provider's name sits next to it,
 * so a logo that cannot be shown costs nothing to drop -- a broken-image glyph is worse than
 * no logo.
 */
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
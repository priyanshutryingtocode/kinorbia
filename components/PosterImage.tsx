import TmdbPosterImage from "@/components/TmdbPosterImage";
import PosterFallback from "@/components/PosterFallback";
import { tmdbImage } from "@/lib/media";

type PosterImageProps = {
  // The raw `poster_path`, not a resolved URL: every call site used to call
  // `tmdbImage` itself, each with its own width and its own null branch.
  path: string | null | undefined;
  // A TMDB size bucket. Four are in use: w92, w185, w342, w500.
  width: string;
  // Empty string marks the poster decorative. A card's <Link> is usually
  // labelled by its poster, so most sites pass the title.
  alt: string;
  // Required, not defaulted. Seven distinct values are in use because the grids,
  // lists and carousel strip have genuinely different widths, and this is the
  // responsive contract: one default would over- or under-fetch on the rest.
  sizes: string;
  className?: string;
  // The `loading`/`fetchPriority` pair browse cards use to promote their first
  // few posters. Not next/image's `priority`, which in Next 16 can also emit a
  // preload link.
  eager?: boolean;
};

// Resolves a TMDB poster path, falling back to the shared placeholder when
// there is none and letting TmdbPosterImage handle a poster that exists but
// fails to load.
//
// No hooks of its own, so it renders from server components; TmdbPosterImage is
// the client boundary. Backdrops do not come through here: MediaDetailPage's
// w1280 hero is decorative and has no fallback on purpose.
export default function PosterImage({
  path,
  width,
  alt,
  sizes,
  className,
  eager = false,
}: PosterImageProps) {
  const src = tmdbImage(path, width);

  if (!src) {
    return <PosterFallback alt={alt || undefined} className={className} />;
  }

  return (
    <TmdbPosterImage
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      loading={eager ? "eager" : undefined}
      fetchPriority={eager ? "high" : undefined}
    />
  );
}
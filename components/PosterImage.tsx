import TmdbPosterImage from "@/components/TmdbPosterImage";
import PosterFallback from "@/components/PosterFallback";
import { tmdbImage } from "@/lib/media";

type PosterImageProps = {
  // The raw `poster_path` off the TMDB payload, not a resolved URL: every
  // call site was calling `tmdbImage` itself, thirteen times, each with its own
  // width argument and its own idea of what to render when it came back null.
  path: string | null | undefined;
  // A TMDB size bucket. Four are in use: w92, w185, w342, w500.
  width: string;
  // Empty string marks the poster decorative. A card's <Link> is usually
  // labelled by its poster, so most sites pass the title.
  alt: string;
  // Required, and deliberately not defaulted. There are seven distinct values
  // across the call sites because the grids, lists and the carousel strip have
  // genuinely different widths, and they are the responsive contract: one
  // default would over- or under-fetch on the others.
  sizes: string;
  className?: string;
  // Maps to the `loading`/`fetchPriority` pair browse cards use to promote their
  // first few posters. Not next/image's `priority`, which in Next 16 can also
  // emit a preload link.
  eager?: boolean;
};

// Resolves a TMDB poster path and renders it, falling back to the shared
// placeholder when there is no poster and letting TmdbPosterImage handle the
// case where one exists but fails to load.
//
// No hooks of its own, so it renders from server components; TmdbPosterImage is
// the client boundary, exactly as before.
//
// Backdrops are not posters and do not come through here. MediaDetailPage's
// w1280 hero is decorative with no fallback on purpose, and putting it in a
// component named for posters would misdescribe it.
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
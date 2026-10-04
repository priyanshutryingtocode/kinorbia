import TmdbPosterImage from "@/components/TmdbPosterImage";
import PosterFallback from "@/components/PosterFallback";
import { tmdbImage } from "@/lib/media";

type PosterImageProps = {
  path: string | null | undefined;
  width: string;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
};

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
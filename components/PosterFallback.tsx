import { Film } from "lucide-react";

// The single definition of "this poster did not render", used by both ways that
// can happen:
//
//   1. TMDB returned no poster path -- PosterImage renders this directly.
//   2. The URL 404'd or failed to decode -- TmdbPosterImage renders this from
//      its onError.
//
// Only the second went through here before, so the two failures looked
// different. Thirteen call sites also each rendered their own icon for the
// first case, which had drifted to three icons at six sizes -- including a
// `UserIcon` where a film belonged, a `Film` with no size class at all, and one
// site with no fallback whatsoever, so its thumbnail silently vanished.
//
// A named `alt` makes the placeholder announce itself as an image with the
// title, which matters because a card's <Link> is labelled by its poster. An
// empty `alt` marks the poster decorative, and the placeholder is hidden from
// assistive tech rather than announced as an unlabelled image.
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
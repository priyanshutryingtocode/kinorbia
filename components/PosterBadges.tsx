import { Star } from "lucide-react";

// The year and rating chips that sit on a poster. Extracted because the two
// surfaces that draw them had each grown their own: the browse grid showed only
// the rating, top-right, and the "More Like This" carousel showed only the year,
// top-left, so the same idea was expressed two ways with two different
// backgrounds -- `bg-scrim/55` on one and `bg-black/55` on the other.
//
// This is the overlay only, not the card. The cards around it stay separate on
// purpose: the grid tile, the search row and the carousel strip differ in image
// `sizes`, hover treatment, caption wording and whether they lift, and merging
// those needs a component that expresses none of them. What they share is two
// pills in the poster's top corners, which is what this is.
//
// Renders as a sibling of PosterImage rather than a child: PosterImage emits the
// <img> or the fallback directly, with no wrapper, so the chips have to position
// against the same `relative` box they always did.

type PosterBadgesProps = {
  // Already a display string, or null to omit the chip entirely. The year is
  // derived by the caller because four different derivations were in use across
  // the app -- getFullYear(), substring, slice, and three different fallbacks
  // ("N/A", "TBD", "Year unknown") -- and they disagree on edge cases like an
  // empty string, which getFullYear() turns into NaN. Fixing that belongs at the
  // call sites that own the semantics, not here.
  year: string | null;
  // TMDB's 0-10 average, shown to one decimal. Omit rather than pass 0 when
  // there is no score: a title with no votes reads as "0.0", which looks like a
  // rating of zero rather than an absence of one.
  rating?: number;
  // "md" is the browse grid, which steps its chips up at the sm breakpoint
  // because the tiles themselves get wider. "sm" is the carousel strip, whose
  // posters are a fixed 128-176px and cannot go smaller without becoming
  // unreadable.
  size?: "sm" | "md";
};

// Identical on both sizes: a scrim-backed pill, since it sits on artwork of
// unknown brightness and must not invert with the theme.
//
// The star inside it is --highlight-vivid, the light gold meant for dark ground,
// NOT the bronze the editorial layer uses. The chip is bg-scrim/55, so its ground
// is dark whatever the artwork is -- and the star used to be `text-highlight`,
// which is dark graphite in light mode and therefore dark on dark: it measured
// 1.29:1 over mid-grey artwork and 1.15:1 over dark. Light gold holds 7.20:1 to
// 13.30:1 across the same range. Bronze would have been worse, at 1.53:1-2.90:1.
const CHIP = "absolute flex items-center gap-1 rounded-full border border-rule bg-scrim/55 text-on-scrim backdrop-blur-md";

const SIZES = {
  md: {
    year: `${CHIP} top-1.5 left-1.5 px-2 py-0.5 text-[10px] font-medium sm:top-2 sm:left-2 sm:px-2.5 sm:py-1 sm:text-xs`,
    rating: `${CHIP} top-1.5 right-1.5 px-2 py-0.5 sm:top-2 sm:right-2 sm:gap-1.5 sm:px-2.5 sm:py-1`,
    star: "h-2.5 w-2.5 fill-highlight-vivid text-highlight-vivid sm:h-3 sm:w-3",
    ratingText: "text-[10px] font-medium sm:text-xs",
  },
  sm: {
    year: `${CHIP} top-2 left-2 px-2.5 py-1 text-xs font-medium`,
    rating: `${CHIP} top-2 right-2 px-2.5 py-1`,
    star: "h-3 w-3 fill-highlight-vivid text-highlight-vivid",
    ratingText: "text-xs font-medium",
  },
} as const;

export default function PosterBadges({ year, rating, size = "md" }: PosterBadgesProps) {
  // A poster with neither a year nor a score gets no overlay at all rather than
  // an empty one.
  if (!year && !rating) {
    return null;
  }

  const s = SIZES[size];

  return (
    <>
      {year && <span className={s.year}>{year}</span>}
      {rating ? (
        <span className={s.rating}>
          <Star className={s.star} aria-hidden="true" />
          <span className={s.ratingText}>{rating.toFixed(1)}</span>
        </span>
      ) : null}
    </>
  );
}

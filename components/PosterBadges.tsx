import { Star } from "lucide-react";


type PosterBadgesProps = {
  year: string | null;
  rating?: number;
  size?: "sm" | "md";
};

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

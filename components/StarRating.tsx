"use client";

import { Star } from "lucide-react";

// Five stars on a 0.5 scale: the app's one rating control.
//
// It was two. MovieRatingControl had this slider and ProfileFavorites had ten buttons
// labelled 1-10 beside a "Choose a score from 1 to 10" prompt, so the same stored value
// was presented on a 10-point scale on one screen and a 5-star scale on another. They are
// one control now, so they cannot drift again.
//
// Storage is untouched: this is 0.5-5 stars and callers send stars x 2, which is the 1-10
// integer the schema and starsLabel already expect. No migration.

type StarRatingProps = {
  /** Current value in stars, 0.5-5. */
  value: number;
  onChange: (stars: number) => void;
  /** Names the control for screen readers, e.g. the title being rated. */
  label: string;
  disabled?: boolean;
  className?: string;
};

const STARS = [1, 2, 3, 4, 5];

export default function StarRating({
  value,
  onChange,
  label,
  disabled = false,
  className = "",
}: StarRatingProps) {
  return (
    <div className={`relative h-9 w-full min-w-30 ${className}`}>
      <div className="flex h-full items-center justify-center gap-1 sm:justify-start">
        {STARS.map((star) => {
          // 0.5 arrives as a half-filled star: the fill covers half of that star's box.
          const fillPercent = Math.max(0, Math.min(1, value - (star - 1))) * 100;

          return (
            <span key={star} className="relative h-6 w-6 text-content-subtle">
              <Star className="h-6 w-6 fill-current" />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden text-highlight-muted"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className="h-6 w-6 fill-current" />
              </span>
            </span>
          );
        })}
      </div>

      {/* Invisible over the stars: the native range gives keyboard, arrow-key and
          screen-reader behaviour that five plain buttons would not. */}
      <input
        type="range"
        min="0.5"
        max="5"
        step="0.5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="kin-focus absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={label}
      />
    </div>
  );
}
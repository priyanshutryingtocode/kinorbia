"use client";

import { Star } from "lucide-react";


type StarRatingProps = {
  value: number;
  onChange: (stars: number) => void;
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
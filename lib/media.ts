import type { MediaType } from "@/types";

export function normalizeMediaType(mediaType: string | null | undefined): MediaType {
  return mediaType === "tv" ? "tv" : "movie";
}

export function mediaKey(mediaType: string | null | undefined, id: string | number | undefined) {
  return `${normalizeMediaType(mediaType)}:${id}`;
}

export function mediaHref(mediaType: string | null | undefined, id: string | number) {
  return normalizeMediaType(mediaType) === "tv" ? `/tv/${id}` : `/movie/${id}`;
}

// The release year, as a 4-digit string, or `fallback` when there isn't one.
//
// This existed five times over: `getFullYear()`, `substring(0, 4)`, `slice(0, 4)`
// and `split("-")[0]`, with four different fallbacks -- "N/A", "TBA", "Year
// unknown" and "". They disagree on real data, not just on missing data:
// `getFullYear()` returns NaN for a date it cannot parse, so a malformed
// release_date rendered the literal string "NaN" in a card's aria-label and on
// its poster chip until MovieCard added a guard. `substring(0, 4)` does the
// opposite and happily returns "20" from "2019-05-01T00:00" style input.
//
// One implementation, NaN-safe, one fallback. The call sites that want a
// different string for a missing year pass it in rather than re-deriving.
export function yearOf(
  value: string | null | undefined,
  fallback = "N/A"
): string {
  if (!value) {
    return fallback;
  }

  // The ISO prefix, not Date parsing: it cannot fail, cannot be shifted by a
  // timezone, and cannot produce NaN. Anything that is not a leading 4-digit
  // year falls back.
  const match = /^(\d{4})/.exec(value.trim());
  return match ? match[1] : fallback;
}

// A 1-10 personal rating shown as stars out of five, to one decimal. Six sites
// were doing `(rating / 2).toFixed(1)` inline. Returns the number only, not a
// label: three of those sites append their own suffix ("stars", "★", nothing),
// and folding that in here would have meant picking one.
export function starsLabel(rating: number) {
  return (rating / 2).toFixed(1);
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function tmdbImage(path: string | null | undefined, size: string) {
  const value = path?.trim();
  if (!value) {
    return null;
  }

  const candidate = value.startsWith("//") ? `https:${value}` : value;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.hostname !== "image.tmdb.org") {
        return null;
      }

      const match = url.pathname.match(/^\/t\/p\/[^/]+\/(.+)$/);
      if (!match) {
        return null;
      }

      return `https://image.tmdb.org/t/p/${size}/${match[1]}`;
    } catch {
      return null;
    }
  }

  const relative = value.replace(/^\/+/, "").replace(/^t\/p\/[^/]+\//, "");
  return relative ? `https://image.tmdb.org/t/p/${size}/${relative}` : null;
}

export function mediaEquals(mediaType: MediaType) {
  if (mediaType === "tv") {
    return "tv";
  }

  return { $in: ["movie", null] };
}

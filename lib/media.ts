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

export function yearOf(
  value: string | null | undefined,
  fallback = "N/A"
): string {
  if (!value) {
    return fallback;
  }

  const match = /^(\d{4})/.exec(value.trim());
  return match ? match[1] : fallback;
}

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

export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const DEFAULT_TMDB_IMAGE_BASE = "https://image.tmdb.org";

function normaliseImageBase(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    const path = url.pathname.replace(/\/t\/p\/[^/]+\/?$/, "").replace(/\/+$/, "");
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

const TMDB_IMAGE_BASE = normaliseImageBase(process.env.TMDB_IMAGE_URL) ?? DEFAULT_TMDB_IMAGE_BASE;
const TMDB_IMAGE_HOST = (() => {
  try {
    return new URL(TMDB_IMAGE_BASE).hostname;
  } catch {
    return "image.tmdb.org";
  }
})();

export function tmdbImage(path: string | null | undefined, size: string) {
  const value = path?.trim();
  if (!value) {
    return null;
  }

  const candidate = value.startsWith("//") ? `https:${value}` : value;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.hostname !== TMDB_IMAGE_HOST) {
        return null;
      }

      const match = url.pathname.match(/^\/t\/p\/[^/]+\/(.+)$/);
      if (!match) {
        return null;
      }

      return `${TMDB_IMAGE_BASE}/t/p/${size}/${match[1]}`;
    } catch {
      return null;
    }
  }

  const relative = value.replace(/^\/+/, "").replace(/^t\/p\/[^/]+\//, "");
  return relative ? `${TMDB_IMAGE_BASE}/t/p/${size}/${relative}` : null;
}

export function mediaEquals(mediaType: MediaType) {
  if (mediaType === "tv") {
    return "tv";
  }

  return { $in: ["movie", null] };
}

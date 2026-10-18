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

// "1 title" / "3 titles". Written out at four sites by hand and three of them shipped
// "1 titles"; a plural that is wrong on exactly the case a viewer is most likely to notice
// is worse than the duplication that caused it.
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// The TMDB image host, from the environment. Bare host plus a configurable image path would
// be two vars, but TMDB has one CDN, so one is enough.
//
// `TMDB_IMAGE_URL` was in .env.local and read nowhere: the host was hardcoded in three places
// here. The tolerant strip is what makes that worth changing -- the value already in
// .env.local is `https://image.tmdb.org/t/p/original`, which embeds a size segment, while the
// caller supplies the size per call. Normalising both shapes to the same origin means the
// variable can be corrected to a bare host without a deployment ordering problem: a Vercel
// environment still holding the old value keeps working, and one that has never been set at
// all falls back to the default.
//
// Every reader of this is a server component (`PosterImage`, `MediaDetailPage`, the server
// halves of the list pages), so a plain process.env is correct here. Nothing client-side may
// import it -- see TmdbPosterImage, which takes an already-resolved src as a prop for that
// reason.
const DEFAULT_TMDB_IMAGE_BASE = "https://image.tmdb.org";

function normaliseImageBase(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    // Detect ANY scheme, not just http(s). Testing /^https?:/ alone means `ftp://host` fails
    // the test, gets `https://` glued on the front, and parses as hostname "ftp" -- which would
    // then silently become the base for every image on the site.
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // `TMDB_IMAGE_URL=undefined` in a shell is an easy mistake, and `new URL` reads it
    // happily as the host "undefined" -- breaking every image with no error anywhere. A real
    // host has a dot, or is localhost.
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    // Drop any trailing size segment: the caller owns the size, and leaving "original"
    // embedded here would produce /t/p/original/t/p/w500/... .
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
      // Only ever a re-size of our own CDN, never a fetch of an arbitrary host someone
      // put in a document.
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

"use client";

export type SearchMediaType = "movie" | "tv";

const LEGACY_KEY = "kinorbia:recent-searches";
const LIMIT = 6;

function storageKey(mediaType: SearchMediaType) {
  return `${LEGACY_KEY}:${mediaType}`;
}

function parseList(raw: string | null): string[] {
  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
}

function readBucket(mediaType: SearchMediaType): string[] {
  try {
    return parseList(localStorage.getItem(storageKey(mediaType)));
  } catch {
    return [];
  }
}

function writeBucket(mediaType: SearchMediaType, entries: string[]) {
  try {
    localStorage.setItem(storageKey(mediaType), JSON.stringify(entries));
  } catch {
    // Storage unavailable (private mode, quota); history is best-effort.
  }
}

// One-time migration: the pre-split feature tracked a single flat list.
// Seed it into the Movies bucket and remove the legacy entry.
function migrateLegacy() {
  let legacyRaw: string | null;
  try {
    legacyRaw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }

  if (legacyRaw === null) {
    return;
  }

  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    return;
  }

  const legacy = parseList(legacyRaw);
  if (legacy.length === 0) {
    return;
  }

  const seen = new Set(legacy.map((item) => item.toLowerCase()));
  const existing = readBucket("movie").filter(
    (item) => !seen.has(item.toLowerCase())
  );
  writeBucket("movie", [...legacy, ...existing].slice(0, LIMIT));
}

export function readRecentSearches(mediaType: SearchMediaType): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  migrateLegacy();
  return readBucket(mediaType).slice(0, LIMIT);
}

export function recordRecentSearch(mediaType: SearchMediaType, rawQuery: string) {
  const query = rawQuery.trim();
  if (!query || typeof window === "undefined") {
    return;
  }

  migrateLegacy();

  const stored = readBucket(mediaType);
  const next = [
    query,
    ...stored.filter((item) => item.toLowerCase() !== query.toLowerCase()),
  ].slice(0, LIMIT);

  writeBucket(mediaType, next);
}

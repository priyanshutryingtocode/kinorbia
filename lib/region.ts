// Which country a member's availability is read for -- the pure half.
//
// Kept free of `next/headers` on purpose so the code validation can be exercised by a script
// as well as a page. The request-reading half is resolveWatchRegion in lib/region.server.ts,
// which is also where the reasoning for ignoring Accept-Language lives.
//
// TMDB's /watch/providers returns every country it has offers for -- 94 to 129 depending on
// the title -- in one response, so nothing here fetches. This module only decides which key
// to read. It never merges two countries' catalogues: showing someone in Delhi the US
// service list is the same bug as showing them nothing.

export const DEFAULT_REGION = "IN";

// ISO 3166-1 alpha-2. Deliberately loose about which codes are real: validating against a
// 249-country list would mean shipping that list, and TMDB's own key set is the only list
// that matters -- an unknown-but-well-formed code simply matches nothing.
export function isRegionCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value.trim());
}

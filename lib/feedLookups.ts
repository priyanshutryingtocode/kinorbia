// Pure lookups over already-fetched maps, with no model imports.
//
// These live apart from lib/reviewRatings.ts and lib/profileLinks.ts because those reach
// for Mongoose, and a "use client" component cannot import them: doing so pulls the whole
// model layer -- and node:async_hooks -- into the browser bundle, which fails the build
// with "server-only cannot be imported from a Client Component module".
//
// Both accept a Map or a plain object, because the server-rendered page holds Maps while
// the appended pages arrive from a server action as objects.

import { mediaKey } from "@/lib/media";
import type { MediaType } from "@/types";

type Usernames = Map<string, string> | Record<string, string>;
type RatingMaps = Map<string, Map<string, number>> | Record<string, Record<string, number>>;

export function usernameFor(
  usernames: Usernames,
  email: string | null | undefined
): string | undefined {
  if (!email) return undefined;
  const key = email.toLowerCase();
  return usernames instanceof Map ? usernames.get(key) : usernames[key];
}

export function lookupRating(
  maps: RatingMaps,
  review: { userEmail: string; movieId?: string; mediaType?: MediaType }
): number {
  const key = mediaKey(review.mediaType, review.movieId);
  const perUser = maps instanceof Map ? maps.get(review.userEmail) : maps[review.userEmail];
  if (!perUser) return 0;
  return perUser instanceof Map ? perUser.get(key) || 0 : perUser[key] || 0;
}
// URL building, here for the same reason as the lookups above: it sat in lib/profileLinks.ts,
// which imports Mongoose, and UserNameLink is a client component. Importing it from there
// dragged the model layer into the browser bundle.
export function profileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

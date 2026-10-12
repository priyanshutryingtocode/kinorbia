// Page sizes, kept out of any `server-only` module on purpose.
//
// `PEOPLE_PAGE_SIZE` lived in lib/profileData.ts (which imports "server-only") while two
// components read it to render a "showing X-Y of Z" range. Latent, not live: it works only
// because neither consumer is a client component today.
export const PEOPLE_PAGE_SIZE = 24;

export const PROFILE_PAGE_SIZES = {
  favorites: 20,
  watchlist: 20,
  reviews: 9,
  lists: 9,
} as const;
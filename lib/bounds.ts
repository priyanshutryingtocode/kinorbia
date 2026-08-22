export const MAX_FAVORITES = 2500;
export const MAX_WATCHLIST = 2500;
export const MAX_REACTORS = 5000;
export const MAX_LIST_MOVIES = 500;

export function hasCapacity(existing: unknown[] | undefined, max: number) {
  return (existing?.length ?? 0) < max;
}
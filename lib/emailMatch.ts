// Matching a session email against a stored User row.
//
// Every write path already normalizes: registerSchema ends in
// .trim().toLowerCase(), and the Google and credentials providers in
// auth.ts both lowercase before they touch the collection. The read paths
// that go through requireUser()/withAuthedUser() are normalized by
// lib/session.ts for the same reason.
//
// What is left are the few callers that read session.user.email directly
// and query User with it. Those are not a harmless style difference: when
// the session email's casing does not match the stored row, the query
// simply matches nothing and the page renders as though the account has
// no favorites, watchlist, or ratings. No error, no redirect, just quietly
// absent data.
//
// Rows written before that normalization existed may still hold a
// mixed-case address, so a lookup cannot assume the lowercase spelling
// either. Match both and let MongoDB pick whichever one is actually
// stored. This is the same reasoning as the lowercased join in
// lib/profileLinks, applied to the filter instead of both sides of a map.
export function emailMatch(email: string): { $in: string[] } {
  const trimmed = email.trim();
  const lower = trimmed.toLowerCase();

  return { $in: lower === trimmed ? [trimmed] : [trimmed, lower] };
}

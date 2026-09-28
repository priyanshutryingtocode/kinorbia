import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// Reviews, lists, and comments all store a *display* name -- `session.user.name`,
// e.g. "Priya Sharma" -- because that is what the byline is supposed to read.
// The public profile route resolves the username *slug* instead
// (`app/(root)/u/[username]/page.tsx` does `User.findOne({ username })`, and
// `User.username` is a `slugifyUsername` derivation of the name, e.g.
// "priya-sharma").
//
// So a byline cannot be linked with the name it already holds: the two are
// different strings, display names are not unique, and every such link would
// 404. `userEmail` is the only reliable join key, and every one of those
// documents already carries it.
//
// Hence one batched `$in` read per page -- the same shape as
// `buildReviewerRatingMaps` in `lib/reviewRatings.ts`, which resolves a page of
// reviews to their authors' ratings the same way.

// Keyed by lowercased email. Emails are written through `requireUser()`, which
// lowercases, but older rows and Google sign-ins are not guaranteed to be, so
// both sides of the join are normalized here instead of at seven call sites.
export async function buildUsernameMap(
  emails: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const normalized = [
    ...new Set(
      emails
        .filter((email): email is string => typeof email === "string" && email.length > 0)
        .map((email) => email.toLowerCase())
    ),
  ];

  if (normalized.length === 0) {
    return new Map();
  }

  await dbConnect();
  // `username: { $exists: true }` matters: an account created before
  // `ensureUserIdentity` ran has no slug, and returning a map entry pointing at
  // `undefined` would render a link to `/u/undefined`.
  const users = await User.find({ email: { $in: normalized }, username: { $exists: true } })
    .select("email username")
    .lean<{ email: string; username: string }[]>();

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.email.toLowerCase(), user.username);
  }
  return map;
}

// Reading side of the join. Returns undefined when the author has no username
// or no account, which is the signal to render plain text instead of a link that
// would dead-end on `notFound()`.
export function usernameFor(
  usernames: Map<string, string>,
  email: string | null | undefined
): string | undefined {
  return email ? usernames.get(email.toLowerCase()) : undefined;
}

// The one place that knows a public profile's URL shape. Three components were
// each spelling out `/u/${encodeURIComponent(username)}` inline.
export function profileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

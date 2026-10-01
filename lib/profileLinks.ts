import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// Reviews, lists, and comments store a *display* name ("Priya Sharma"), but the
// public profile route resolves a *slug* ("priya-sharma"). A byline cannot be
// linked with the name it already holds: they are different strings, display
// names are not unique, and every such link would 404. `userEmail` is the only
// reliable join key, and every one of those documents already carries it -- hence
// one batched `$in` read per page, the same shape as buildReviewerRatingMaps.

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
  // `$exists` matters: an account predating `ensureUserIdentity` has no slug, and
  // an entry pointing at `undefined` renders a link to `/u/undefined`.
  const users = await User.find({ email: { $in: normalized }, username: { $exists: true } })
    .select("email username")
    .lean<{ email: string; username: string }[]>();

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.email.toLowerCase(), user.username);
  }
  return map;
}

// Reading side. Undefined when the author has no username or no account, which
// is the signal to render plain text rather than a link that would dead-end.
export function usernameFor(
  usernames: Map<string, string>,
  email: string | null | undefined
): string | undefined {
  return email ? usernames.get(email.toLowerCase()) : undefined;
}

// The one place that knows a public profile's URL shape.
export function profileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

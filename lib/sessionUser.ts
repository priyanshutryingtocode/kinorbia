import { cache } from "react";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

/**
 * The member's own row, as the session needs it.
 *
 * `name`, `image` and `username` hydrate the session; `sessionsInvalidBefore` is the
 * session-revocation marker, which has to be read fresh on every request or a revoked
 * session keeps working; `shareActivityAsked` is the one-time consent prompt, which used to
 * cost a second query of the very same document on every media page.
 */
type SessionUserRecord = {
  name?: string;
  image?: string | null;
  sessionsInvalidBefore?: Date | null;
  username?: string | null;
  shareActivityAsked?: boolean;
};

/**
 * The session user lookup, memoised for the length of one request.
 *
 * `auth()` runs this on every call, and a signed-in movie page calls `auth()` five times --
 * once for the page and once for each of the up-to-four comment threads it renders. Each call
 * was a separate `User.findOne`, so the same row was read five times to answer one question.
 *
 * React's `cache()` is the mechanism for that: it memoises by function and arguments, per
 * request, and concurrent callers share the same in-flight promise. Without a request scope it
 * is a plain call, so this is safe to call from anywhere -- a route handler simply gets the
 * current behaviour rather than a memoised one.
 *
 * It deliberately does NOT swallow errors. React memoises a rejection as well as a value, and
 * the caller needs to tell "no such member" (the session is expired) apart from "the lookup
 * failed" (fall back to the token). Both are handled where the result is used.
 */
export const loadSessionUser = cache(async (email: string): Promise<SessionUserRecord | null> => {
  await dbConnect();

  return User.findOne({ email })
    .select("name image sessionsInvalidBefore username shareActivityAsked")
    .lean<SessionUserRecord | null>();
});

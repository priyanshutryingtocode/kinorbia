import { randomBytes } from "node:crypto";

import User from "@/models/User";

// A hard ceiling on the walk. `usernameCandidates` ends on its own, so a caller
// cannot spin forever issuing `exists` queries -- which two of them previously
// could, if every candidate up to some suffix was taken. On an unauthenticated
// registration path that is a request that never returns.
const MAX_USERNAME_ATTEMPTS = 20;

// The candidate sequence for a username derived from a name: `base`, `base-1`,
// `base-2`, ... Three call sites needed this and each had spelled out the same
// base/suffix/increment loop, with two different ways of deciding when to stop
// (poll `exists`, or retry on a duplicate-key error). Sharing the derivation
// leaves each of them with only its own commit strategy.
//
// Bounded rather than endless. The bound used to live in auth.ts alone, so the
// two call sites that poll `exists` -- register, and ensureUserIdentity below --
// inherited an infinite generator and each had to remember to stop. Centralising
// it here is the fix; auth.ts keeps its own counter because its duplicate-key
// retry is a different strategy, not a candidate walk.
export function* usernameCandidates(base: string): Generator<string> {
  let username = base;
  let suffix = 1;

  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt += 1) {
    yield username;
    username = `${base}-${suffix}`;
    suffix += 1;
  }
}

export function slugifyUsername(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);

  return slug || "kinorbia-user";
}

// Returns void: both callers already know whether the account is missing (both
// hold the document) and only await this for its side effect, so returning a
// document nobody reads was pure surface area.
export async function ensureUserIdentity(email: string, name: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail })
    .select("username")
    .lean<{ username?: string } | null>();

  if (!user || user.username) {
    return;
  }

  const base = slugifyUsername(name || normalizedEmail.split("@")[0]);

  // `username` only escapes the loop when a free candidate was actually found.
  // Falling out of the generator having found nothing used to leave it equal to
  // `base`, which is by definition taken -- so the update below either failed on
  // the unique index or, on the sign-in path, silently left the account without
  // a username. `freed` is what distinguishes those.
  let username: string | undefined;

  for (const candidate of usernameCandidates(base)) {
    if (!(await User.exists({ username: candidate, email: { $ne: normalizedEmail } }))) {
      username = candidate;
      break;
    }
  }

  if (!username) {
    // Every candidate up to the ceiling is occupied. Append a random suffix
    // rather than giving up: this runs during sign-in and a missing username is
    // not something the caller can recover from.
    username = `${base}-${randomBytes(3).toString("hex")}`;
  }

  // A targeted update rather than mutating a loaded document: the old version
  // hydrated both embedded arrays only to save one string.
  await User.updateOne({ email: normalizedEmail }, { $set: { username } });
}

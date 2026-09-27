import User from "@/models/User";

// The candidate sequence for a username derived from a name: `base`, `base-1`,
// `base-2`, ... Three call sites needed this and each had spelled out the same
// base/suffix/increment loop, with two different ways of deciding when to stop
// (poll `exists`, or retry on a duplicate-key error). Sharing the derivation
// leaves each of them with only its own commit strategy.
export function* usernameCandidates(base: string): Generator<string> {
  let username = base;
  let suffix = 1;

  for (;;) {
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
  let username = base;

  for (const candidate of usernameCandidates(base)) {
    if (!(await User.exists({ username: candidate, email: { $ne: normalizedEmail } }))) {
      username = candidate;
      break;
    }
  }

  // A targeted update rather than mutating a loaded document: the old version
  // hydrated both embedded arrays only to save one string.
  await User.updateOne({ email: normalizedEmail }, { $set: { username } });
}

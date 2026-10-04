import { randomBytes } from "node:crypto";

import User from "@/models/User";

const MAX_USERNAME_ATTEMPTS = 20;

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

export async function ensureUserIdentity(email: string, name: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail })
    .select("username")
    .lean<{ username?: string } | null>();

  if (!user || user.username) {
    return;
  }

  const base = slugifyUsername(name || normalizedEmail.split("@")[0]);

  let username: string | undefined;

  for (const candidate of usernameCandidates(base)) {
    if (!(await User.exists({ username: candidate, email: { $ne: normalizedEmail } }))) {
      username = candidate;
      break;
    }
  }

  if (!username) {
    username = `${base}-${randomBytes(3).toString("hex")}`;
  }
  await User.updateOne({ email: normalizedEmail }, { $set: { username } });
}

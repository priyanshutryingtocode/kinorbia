import User from "@/models/User";

export function slugifyUsername(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);

  return slug || "kinorbia-user";
}

export async function ensureUserIdentity(email: string, name = "KinOrbia user") {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return null;
  }

  if (user.username) {
    return user;
  }

  const base = slugifyUsername(name || normalizedEmail.split("@")[0]);
  let username = base;
  let suffix = 1;

  while (await User.exists({ username, email: { $ne: normalizedEmail } })) {
    username = `${base}-${suffix}`;
    suffix += 1;
  }

  user.username = username;
  await user.save();
  return user;
}

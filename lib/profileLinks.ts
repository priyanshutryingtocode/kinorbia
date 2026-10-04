import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export function usernameMapFromUsers(
  users: { email: string; username?: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    if (user.username) {
      map.set(user.email.toLowerCase(), user.username);
    }
  }
  return map;
}

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
  const users = await User.find({ email: { $in: normalized }, username: { $exists: true } })
    .select("email username")
    .lean<{ email: string; username: string }[]>();

  return usernameMapFromUsers(users);
}

export function usernameFor(
  usernames: Map<string, string>,
  email: string | null | undefined
): string | undefined {
  return email ? usernames.get(email.toLowerCase()) : undefined;
}

export function profileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

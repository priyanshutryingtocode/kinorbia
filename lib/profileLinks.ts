import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export function usernameMapFromUsers(
  users: { email: string; username?: string | null }[]
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

// Re-exported from the model-free module so server callers keep one import path.
// Both are model-free and live in lib/feedLookups.ts so client components can import
// them without pulling Mongoose in. Re-exported here to keep existing call sites unchanged.
export { profileHref, usernameFor } from "@/lib/feedLookups";

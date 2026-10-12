import { auth } from "@/auth";

export type SessionUser = {
  email: string;
  name: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = (await auth())?.user;
  const email = user?.email;

  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  return {
    email: email.trim().toLowerCase(),
    name: typeof user?.name === "string" ? user.name : null,
  };
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationRequiredError();
  }
  return user;
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Guards a server action: redirects anonymous users to login and returns the
// caller's normalized email plus a display-name fallback for denormalized docs.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return {
    email: session.user.email.toLowerCase(),
    name: session.user.name || "KinOrbia user",
  };
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Page-level guard: redirects anonymous visitors to login and returns the
// caller's normalized email. Use only on routes that are always private — the
// public activity feed and public profiles need a nullable variant instead.
export async function requireUserEmail() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return session.user.email.toLowerCase();
}

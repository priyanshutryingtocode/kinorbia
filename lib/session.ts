import { auth } from "@/auth";

export async function getSessionUser(): Promise<{ email: string | null; name: string | null }> {
  const session = await auth();
  const email = session?.user?.email;
  return {
    email: typeof email === "string" ? email.toLowerCase().trim() : null,
    name: typeof session?.user?.name === "string" ? session.user.name : null,
  };
}

export async function getSessionEmail(): Promise<string | null> {
  return (await getSessionUser()).email;
}

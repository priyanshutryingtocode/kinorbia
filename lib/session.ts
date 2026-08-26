import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { withRateLimit } from "@/lib/rateLimit";

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

// Wraps an authenticated API handler: resolves the session user (401 when
// signed out), connects to the database, funnels thrown errors into a
// consistent 500 response, and applies the given rate limit.
export function withAuthedUser(
  handler: (req: Request, user: { email: string; name: string | null }) => Promise<Response>,
  options: { windowMs: number; limit: number; errorLabel: string }
) {
  return withRateLimit(
    async (req: Request) => {
      try {
        const user = await getSessionUser();
        if (!user.email) {
          return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        return await handler(req, { email: user.email, name: user.name });
      } catch (error) {
        console.error(`Error ${options.errorLabel}:`, error);
        return NextResponse.json({ message: `Error ${options.errorLabel}` }, { status: 500 });
      }
    },
    { windowMs: options.windowMs, limit: options.limit }
  );
}

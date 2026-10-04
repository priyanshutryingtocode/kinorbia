import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { withRateLimit } from "@/lib/rateLimit";

async function getSessionUser(): Promise<{ email: string | null; name: string | null }> {
  const session = await auth();
  const email = session?.user?.email;
  return {
    email: typeof email === "string" ? email.toLowerCase().trim() : null,
    name: typeof session?.user?.name === "string" ? session.user.name : null,
  };
}

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
    options
  );
}

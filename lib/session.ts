import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { withRateLimit } from "@/lib/rateLimit";
import { getCurrentUser, type SessionUser } from "@/lib/authUser";

export function withAuthedUser(
  handler: (req: Request, user: SessionUser) => Promise<Response>,
  options: { windowMs: number; limit: number; errorLabel: string }
) {
  return withRateLimit(
    async (req: Request) => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        return await handler(req, user);
      } catch (error) {
        console.error(`Error ${options.errorLabel}:`, error);
        return NextResponse.json({ message: `Error ${options.errorLabel}` }, { status: 500 });
      }
    },
    options
  );
}

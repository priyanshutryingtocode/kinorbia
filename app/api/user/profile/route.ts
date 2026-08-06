import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { updateProfileSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";

export const PUT = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseBody(req, updateProfileSchema);
      if (!body) {
        return badRequest("A valid name and bio are required.");
      }

      await dbConnect();

      await User.findOneAndUpdate(
        { email },
        { name: body.name, bio: body.bio }
      );

      return NextResponse.json({ user: { name: body.name, bio: body.bio }, message: "Profile updated" });
    } catch {
      return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 30 }
);
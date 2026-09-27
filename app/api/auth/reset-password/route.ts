import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { z } from "zod";
import { parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { hashToken } from "@/lib/token";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(256),
  password: z.string().min(8).max(72),
});

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, resetPasswordSchema);
      if (!body) {
        return badRequest("A valid token and password are required.");
      }

      await dbConnect();
      const tokenHash = hashToken(body.token);
      // Projected because this route is unauthenticated: without it the query
      // would hydrate the whole document, including both embedded arrays, to
      // read one date.
      const user = await User.findOne({
        "resetToken.token": tokenHash,
        "resetToken.expiresAt": { $gt: new Date() },
      })
        .select("emailVerified")
        .lean<{ _id?: unknown; emailVerified?: Date | null } | null>();

      if (!user) {
        return NextResponse.json(
          { message: "This reset link is invalid or has expired." },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            // Redeeming a reset link is itself proof of inbox control, so it
            // doubles as verification. Keeps `emailVerified` from needing a
            // second round trip for a user who arrives here unverified.
            emailVerified: user.emailVerified ?? new Date(),
            // Invalidate every JWT session issued before this moment.
            sessionsInvalidBefore: new Date(),
          },
          $unset: { resetToken: 1 },
        }
      );

      return NextResponse.json({ message: "Password updated. You can now sign in." });
    } catch (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ message: "Error resetting password" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 10 }
);

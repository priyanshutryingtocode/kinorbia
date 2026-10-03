import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { z } from "zod";
import { parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/token";
import { sendEmail, buildLink } from "@/lib/email";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
});

// The same cost register and reset-password hash at, so the decoy below is
// comparable to a real credential verification rather than merely plausible.
const BCRYPT_COST = 10;

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, forgotPasswordSchema);
      if (!body) {
        return badRequest("A valid email is required.");
      }

      await dbConnect();
      const user = await User.findOne({ email: body.email }).select("email provider");

      // No `emailVerified` check here on purpose. Sign-in no longer requires a
      // confirmed address, and redeeming a reset link proves inbox control, so
      // this path both recovers the account and marks it verified. An
      // unverified user asking for help is the common case, not an edge case.
      if (user?.provider === "credentials") {
        const resetToken = generateToken();
        const resetTokenHash = hashToken(resetToken);
        const resetTokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              resetToken: {
                token: resetTokenHash,
                expiresAt: resetTokenExpiresAt,
              },
            },
          }
        );

        try {
          await sendEmail({
            to: body.email,
            subject: "Reset your KinOrbia password",
            html: [
              "<h2>Reset your password</h2>",
              "<p>Click the link below to choose a new password. This link expires in 1 hour.</p>",
              `<p><a href="${buildLink(`/reset-password?token=${resetToken}`)}">Reset password</a></p>`,
              "<p>If you did not request this, you can ignore this email.</p>",
            ].join("\n"),
          });
        } catch (error) {
          console.error("Failed to send reset email:", error);
        }
      } else {
        // Burn comparable CPU so the two branches cost roughly the same.
        //
        // This used to hash a single throwaway token, which is a SHA-256 over 64
        // bytes -- microseconds, against a full HTTPS round trip to Resend on the
        // other branch. The stated goal of not distinguishing the two cases by
        // timing was not achieved by that; register/route.ts does it correctly
        // with a real bcrypt hash.
        //
        // Honest limit: bcrypt is ~68ms and a Resend call is 200-800ms, so this
        // narrows the signal rather than closing it. Closing it properly means
        // always sending an email or always skipping one, and burning a paid API
        // call on every unknown address is the worse trade. The generic response
        // below is the real defence; this just stops the gap being 100x.
        await bcrypt.hash(generateToken(), BCRYPT_COST);
      }

      return NextResponse.json({
        message: "If an account exists for that email, a reset link has been sent.",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      return NextResponse.json({ message: "Error sending password reset" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 5 }
);

import { NextResponse } from "next/server";
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

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, forgotPasswordSchema);
      if (!body) {
        return badRequest("A valid email is required.");
      }

      await dbConnect();
      const user = await User.findOne({ email: body.email }).select("email provider");

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

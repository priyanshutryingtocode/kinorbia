import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rateLimit";
import { parseBody, badRequest } from "@/lib/validators";
import { sendEmail, buildLink } from "@/lib/email";
import { generateToken } from "@/lib/token";
import { issueResetToken } from "@/features/auth/mutations";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
});

const BCRYPT_COST = 10;

export const POST = withRateLimit(
  async (req: Request) => {
    const body = await parseBody(req, forgotPasswordSchema);
    if (!body) {
      return badRequest("A valid email is required.");
    }

    try {
      const issued = await issueResetToken(body.email);

      if (issued.outcome === "issued") {
        try {
          await sendEmail({
            to: body.email,
            subject: "Reset your KinOrbia password",
            html: [
              "<h2>Reset your password</h2>",
              "<p>Click the link below to choose a new password. This link expires in 1 hour.</p>",
              `<p><a href="${buildLink(`/reset-password?token=${issued.token}`)}">Reset password</a></p>`,
              "<p>If you did not request this, you can ignore this email.</p>",
            ].join("\n"),
          });
        } catch (error) {
          logger.error("Failed to send reset email:", { error: error });
        }
      } else {
        // No account, or one without a password. Burn comparable CPU so the response
        // time does not reveal which addresses are registered.
        await bcrypt.hash(generateToken(), BCRYPT_COST);
      }

      return NextResponse.json({
        message: "If an account exists for that email, a reset link has been sent.",
      });
    } catch (error) {
      logger.error("Error sending password reset:", { error: error });
      return NextResponse.json({ message: "Error sending password reset" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 5 }
);

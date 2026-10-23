import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { sendEmail, buildLink } from "@/lib/email";
import { clearVerifyToken, issueVerifyToken } from "@/features/auth/mutations";
import { logger } from "@/lib/logger";

// Issues a verification link on demand.
export const POST = withAuthedUser(
  async (_req, { email }) => {
    const issued = await issueVerifyToken(email);

    if (issued.outcome === "already-verified") {
      return NextResponse.json({ message: "Your email is already verified." });
    }

    if (issued.outcome === "already-pending") {
      return NextResponse.json({ message: "A verification link is already on its way." });
    }

    if (issued.outcome === "no-account") {
      return NextResponse.json({ message: "Account not found. Sign in again." }, { status: 404 });
    }

    try {
      await sendEmail({
        to: email,
        subject: "Verify your KinOrbia email",
        html: [
          "<h2>Confirm your email</h2>",
          "<p>Verifying lets you post public reviews, lists, and comments.</p>",
          `<p><a href="${buildLink(`/api/verify-email?token=${issued.token}`)}">Verify email</a></p>`,
          "<p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>",
        ].join("\n"),
      });
    } catch (error) {
      logger.error("Failed to send verification email:", { error: error });
      await clearVerifyToken(email);
      return NextResponse.json({ message: "Could not send the verification email. Try again." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification link sent. Check your inbox." });
  },
  { windowMs: 60 * 1000, limit: 5, errorLabel: "requesting email verification" }
);

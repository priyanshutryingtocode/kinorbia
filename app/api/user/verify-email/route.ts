import { NextResponse } from "next/server";
import User from "@/models/User";
import { withAuthedUser } from "@/lib/session";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/token";
import { sendEmail, buildLink } from "@/lib/email";

// Issues a verification link on demand. The address comes from the session
// rather than the request body, so this can never be pointed at someone else's
// inbox. Sign-in does not require a verified address; this is how a user opts
// in to posting publicly.
export const POST = withAuthedUser(
  async (_req, { email }) => {
    const user = await User.findOne({ email }).select("emailVerified verifyToken");

    if (user?.emailVerified) {
      return NextResponse.json({ message: "Your email is already verified." });
    }

    // Don't re-send while a link is still live: the old one has not expired,
    // so a second email would only create two ways to fail.
    if (user?.verifyToken?.expiresAt && user.verifyToken.expiresAt > new Date()) {
      return NextResponse.json({ message: "A verification link is already on its way." });
    }

    // The session can outlive the account it points at, so fall through the
    // two checks above without finding a document.
    if (!user) {
      return NextResponse.json({ message: "Account not found. Sign in again." }, { status: 404 });
    }

    const verifyToken = generateToken();

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          verifyToken: {
            token: hashToken(verifyToken),
            expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          },
        },
      }
    );

    try {
      await sendEmail({
        to: email,
        subject: "Verify your KinOrbia email",
        html: [
          "<h2>Confirm your email</h2>",
          "<p>Verifying lets you post public reviews, lists, and comments.</p>",
          `<p><a href="${buildLink(`/api/verify-email?token=${verifyToken}`)}">Verify email</a></p>`,
          "<p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>",
        ].join("\n"),
      });
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Clear the token so a failed send doesn't leave a dead link that
      // suppresses the cooldown above and blocks a retry.
      await User.updateOne({ _id: user._id }, { $unset: { verifyToken: 1 } });
      return NextResponse.json({ message: "Could not send the verification email. Try again." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification link sent. Check your inbox." });
  },
  { windowMs: 60 * 1000, limit: 5, errorLabel: "requesting email verification" }
);

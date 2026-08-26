import { NextResponse } from "next/server";
import dbConnect, { isDuplicateKeyError } from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { slugifyUsername } from "@/lib/userIdentity";
import { registerSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/token";
import { sendEmail, buildLink } from "@/lib/email";

// Identical body for every outcome so the endpoint cannot be used to
// enumerate registered emails.
const GENERIC_RESPONSE = {
  message:
    "Registration received. If this email is new, check your inbox for a verification link.",
};

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, registerSchema);

      if (!body) {
        return badRequest("All fields are required. Name (max 60), a valid email, and a password of at least 8 characters.");
      }

      await dbConnect();

      const hashedPassword = await bcrypt.hash(body.password, 10);

      const existingUser = await User.findOne({ email: body.email })
        .select("_id")
        .lean<{ _id: unknown } | null>();

      if (existingUser) {
        // Burn comparable CPU (bcrypt) so timing matches the create branch.
        void hashedPassword;
        return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
      }

      const baseUsername = slugifyUsername(body.name || body.email.split("@")[0]);
      let username = baseUsername;
      let suffix = 1;

      while (await User.exists({ username })) {
        username = `${baseUsername}-${suffix}`;
        suffix += 1;
      }

      const verifyToken = generateToken();
      const verifyTokenHash = hashToken(verifyToken);
      const verifyTokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      try {
        await User.create({
          name: body.name,
          email: body.email,
          password: hashedPassword,
          provider: "credentials",
          username,
          verifyToken: {
            token: verifyTokenHash,
            expiresAt: verifyTokenExpiresAt,
          },
        });
      } catch (error) {
        // Lost a unique-index race (email or username taken concurrently):
        // report the generic outcome rather than leaking which.
        if (isDuplicateKeyError(error)) {
          return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
        }
        throw error;
      }

      try {
        await sendEmail({
          to: body.email,
          subject: "Verify your KinOrbia email",
          html: [
            "<h2>Welcome to KinOrbia</h2>",
            "<p>Confirm your email address to keep your account secure.</p>",
            `<p><a href="${buildLink(`/verify-email?token=${verifyToken}`)}">Verify email</a></p>`,
            "<p>If you did not create this account, you can ignore this email.</p>",
          ].join("\n"),
        });
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }

      return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
    } catch (error) {
      console.error("Registration failed:", error);

      if (error instanceof Error && error.name === "MongooseServerSelectionError") {
        return NextResponse.json(
          { message: "Database connection failed. Check your MongoDB Atlas network access settings." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          message:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.message
              : "An error occurred while registering the user.",
        },
        { status: 500 }
      );
    }
  },
  { windowMs: 60 * 1000, limit: 5 }
);

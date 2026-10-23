import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";
import { registerSchema, parseBody, badRequest } from "@/lib/validators";
import { slugifyUsername } from "@/lib/userIdentity";
import { registerUser } from "@/features/auth/mutations";
import { logger } from "@/lib/logger";

// The same answer is returned whether the address was taken, the username collided,
// or the account was created. Anything else would let a caller learn which addresses
// are registered.
const GENERIC_RESPONSE = {
  message: "If that address can be registered, a confirmation email is on its way.",
};

export const POST = withRateLimit(
  async (req: Request) => {
    const body = await parseBody(req, registerSchema);
    if (!body) {
      return badRequest("All fields are required. Name (max 60), a valid email, and a password of at least 8 characters.");
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    try {
      await registerUser({
        name: body.name,
        email: body.email,
        password: hashedPassword,
        baseUsername: slugifyUsername(body.name || body.email.split("@")[0]),
      });
    } catch (error) {
      logger.error("Registration failed:", { error: error });

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

    return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
  },
  { windowMs: 60 * 1000, limit: 5 }
);

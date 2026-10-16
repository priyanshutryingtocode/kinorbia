import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rateLimit";
import { parseBody, badRequest } from "@/lib/validators";
import { consumeResetToken } from "@/features/auth/mutations";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(256),
  password: z.string().min(8).max(72),
});

const BCRYPT_COST = 10;

export const POST = withRateLimit(
  async (req: Request) => {
    const body = await parseBody(req, resetPasswordSchema);
    if (!body) {
      return badRequest("A valid token and password are required.");
    }

    try {
      const hashedPassword = await bcrypt.hash(body.password, BCRYPT_COST);
      const result = await consumeResetToken(body.token, hashedPassword);

      if (result === "invalid") {
        return NextResponse.json(
          { message: "This reset link is invalid or has expired." },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: "Password updated. You can now sign in." });
    } catch (error) {
      logger.error("Error resetting password:", { error: error });
      return NextResponse.json({ message: "Error resetting password" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 10 }
);

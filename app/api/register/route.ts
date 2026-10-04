import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import dbConnect, { isDuplicateKeyError } from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { slugifyUsername, usernameCandidates } from "@/lib/userIdentity";
import { registerSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";


const GENERIC_RESPONSE = {
  message: "Registration received. If this email is new, you can sign in now.",
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

      let username: string | undefined;

      for (const candidate of usernameCandidates(baseUsername)) {
        if (!(await User.exists({ username: candidate }))) {
          username = candidate;
          break;
        }
      }

      if (!username) {
        username = `${baseUsername}-${randomBytes(3).toString("hex")}`;
      }

      try {
        await User.create({
          name: body.name,
          email: body.email,
          password: hashedPassword,
          provider: "credentials",
          username,
        });
      } catch (error) {

        if (isDuplicateKeyError(error)) {
          return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
        }
        throw error;
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

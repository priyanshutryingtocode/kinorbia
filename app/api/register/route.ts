import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { slugifyUsername } from "@/lib/userIdentity";
import { registerSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, registerSchema);

      if (!body) {
        return badRequest("All fields are required. Name (max 60), a valid email, and a password of at least 8 characters.");
      }

      await dbConnect();

      const existingUser = await User.findOne({ email: body.email });
      if (existingUser) {
        return NextResponse.json(
          { message: "User already exists." },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);

      const baseUsername = slugifyUsername(body.name || body.email.split("@")[0]);
      let username = baseUsername;
      let suffix = 1;

      while (await User.exists({ username })) {
        username = `${baseUsername}-${suffix}`;
        suffix += 1;
      }

      await User.create({
        name: body.name,
        email: body.email,
        password: hashedPassword,
        provider: "credentials",
        username,
      });

      return NextResponse.json({ message: "User registered." }, { status: 201 });
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

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { message: "All fields are required." },
        { status: 400 }
      );
    }

    if (normalizedPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      provider: "credentials",
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
}

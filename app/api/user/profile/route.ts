import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Your auth helper
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, bio } = await req.json();

    console.log("👉 API Received:", { name, bio });

    await dbConnect();

    // Update the user
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email }, // Find by email
      { name, bio },                 // Update these fields
      { new: true }                  // Return the updated document
    );

    console.log("👉 MongoDB Updated:", updatedUser);

    return NextResponse.json({ user: updatedUser, message: "Profile updated" });
  } catch (error) {
    return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
  }
}
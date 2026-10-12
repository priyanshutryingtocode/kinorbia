import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { updateProfileSchema, parseBody, badRequest } from "@/lib/validators";
import { updateProfile } from "@/features/profile/mutations";

export const PUT = withAuthedUser(
  async (req, { email }) => {
    const body = await parseBody(req, updateProfileSchema);
    if (!body) {
      return badRequest("A valid name and bio are required.");
    }

    const result = await updateProfile(email, { name: body.name, bio: body.bio });

    if (result === "no-account") {
      return NextResponse.json({ message: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ user: { name: body.name, bio: body.bio }, message: "Profile updated" });
  },
  { windowMs: 60 * 1000, limit: 30, errorLabel: "updating profile" }
);

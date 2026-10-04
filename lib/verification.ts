import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function isEmailVerified(email: string): Promise<boolean> {
  await dbConnect();

  const user = await User.findOne({ email })
    .select("emailVerified")
    .lean<{ emailVerified?: Date | null } | null>();

  return Boolean(user?.emailVerified);
}

export const VERIFICATION_REQUIRED_MESSAGE =
  "Verify your email to post publicly. You can request a link from your profile.";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// Verification is deliberately *not* cached on the session. A user who
// redeems a link should be able to post publicly on their very next action
// rather than after the session's own lifetime elapses. One indexed point
// lookup on the unique `email` is cheaper than the staleness it prevents.
export async function isEmailVerified(email: string): Promise<boolean> {
  await dbConnect();

  const user = await User.findOne({ email })
    .select("emailVerified")
    .lean<{ emailVerified?: Date | null } | null>();

  return Boolean(user?.emailVerified);
}

export const VERIFICATION_REQUIRED_MESSAGE =
  "Verify your email to post publicly. You can request a link from your profile.";

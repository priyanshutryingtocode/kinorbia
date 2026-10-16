import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { shareActivitySchema, parseBody, badRequest } from "@/lib/validators";
import { updateShareActivity } from "@/features/profile/mutations";

export const PUT = withAuthedUser(
  async (req, { email }) => {
    const body = await parseBody(req, shareActivitySchema);
    if (!body) {
      return badRequest("A valid share value is required.");
    }

    const result = await updateShareActivity(email, body.share);

    if (result === "no-account") {
      return NextResponse.json({ message: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({
      share: body.share,
      message: body.share
        ? "Titles you mark watched will appear in your followers' activity feeds."
        : "Watch activity is hidden, and past titles have been removed from your followers' feeds.",
    });
  },
  { windowMs: 60 * 1000, limit: 30, errorLabel: "updating sharing preference" }
);
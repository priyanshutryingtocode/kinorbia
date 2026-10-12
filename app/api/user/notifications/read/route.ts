import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuthedUser } from "@/lib/session";
import { markNotificationsRead } from "@/features/social/mutations";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await req.json().catch(() => null);
    const rawId = typeof body?.id === "string" ? body.id.trim() : "";
    const id = mongoose.isValidObjectId(rawId) ? rawId : "";

    // No valid id means "mark everything", which is the same call with no id rather
    // than a second code path.
    await markNotificationsRead(email, id || undefined);

    return NextResponse.json({ ok: true });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "updating notifications" }
);
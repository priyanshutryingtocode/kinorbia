import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Notification from "@/models/Notification";
import { withAuthedUser } from "@/lib/session";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await req.json().catch(() => null);
    const rawId = typeof body?.id === "string" ? body.id.trim() : "";
    const id = mongoose.isValidObjectId(rawId) ? rawId : "";

    if (id) {
      await Notification.updateOne({ _id: id, userEmail: email }, { $set: { read: true } });
    } else {
      await Notification.updateMany(
        { userEmail: email, read: false },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ ok: true });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "updating notifications" }
);

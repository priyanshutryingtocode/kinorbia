import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import { getSessionEmail } from "@/lib/session";
import { withRateLimit } from "@/lib/rateLimit";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json().catch(() => null);
      const rawId = typeof body?.id === "string" ? body.id.trim() : "";
      const id = mongoose.isValidObjectId(rawId) ? rawId : "";

      await dbConnect();

      if (id) {
        await Notification.updateOne({ _id: id, userEmail: email }, { $set: { read: true } });
      } else {
        await Notification.updateMany(
          { userEmail: email, read: false },
          { $set: { read: true } }
        );
      }

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ message: "Error updating notifications" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 60 }
);
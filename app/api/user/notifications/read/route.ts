import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { isObjectId } from "@/lib/objectId";
import { markNotificationsRead } from "@/features/social/mutations";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const rawBody = await req.text();
    let body: unknown = null;

    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
      }

      if (body === null) {
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
      }
    }

    if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const hasId = body !== null && Object.hasOwn(body, "id");
    const rawId = body && "id" in body && typeof body.id === "string" ? body.id.trim() : "";
    if (hasId && !isObjectId(rawId)) {
      return NextResponse.json({ message: "A valid notification ID is required." }, { status: 400 });
    }

    const id = hasId ? rawId : undefined;
    await markNotificationsRead(email, id);

    return NextResponse.json({ ok: true });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "updating notifications" }
);

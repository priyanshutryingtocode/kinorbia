import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { buildExportBundle } from "@/features/profile/queries";

export const GET = withAuthedUser(
  async (_req, { email }) => {
    const data = await buildExportBundle(email);

    if (!data) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kinorbia-export-${date}.json"`,
        // This body is one member's entire account. It must not sit in a shared cache or in the
        // browser's disk cache where a later session on the same machine could read it back.
        "Cache-Control": "no-store",
        // Stops a browser from second-guessing the content type and rendering the file inline.
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { windowMs: 60 * 1000, limit: 5, errorLabel: "exporting data" }
);

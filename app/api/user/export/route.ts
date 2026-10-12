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
      },
    });
  },
  { windowMs: 60 * 1000, limit: 5, errorLabel: "exporting data" }
);

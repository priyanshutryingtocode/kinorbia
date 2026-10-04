import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { hashToken } from "@/lib/token";

const RESULT_PAGE = "/verify-email";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  let status: "success" | "already" | "invalid" = "invalid";

  if (token && token.length <= 256) {
    await dbConnect();
    const user = await User.findOne({ "verifyToken.token": hashToken(token) })
      .select("emailVerified verifyToken.expiresAt")
      .lean<{
        _id?: unknown;
        emailVerified?: Date | null;
        verifyToken?: { expiresAt?: Date };
      } | null>();

    if (user?.emailVerified) {
      // Reached when the address was proven by a password reset or Google
      // while an older verification link was still outstanding.
      await User.updateOne({ _id: user._id }, { $unset: { verifyToken: 1 } });
      status = "already";
    } else if (user?.verifyToken?.expiresAt && user.verifyToken.expiresAt > new Date()) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { emailVerified: new Date() },
          $unset: { verifyToken: 1 },
        }
      );
      status = "success";
    }
  }

  const base = new URL(req.url).origin;
  return NextResponse.redirect(new URL(`${RESULT_PAGE}?status=${status}`, base), 303);
}

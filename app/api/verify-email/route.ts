import { NextResponse } from "next/server";
import { consumeVerifyToken } from "@/features/auth/mutations";

const RESULT_PAGE = "/verify-email";
const MAX_TOKEN_LENGTH = 256;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  let status: "success" | "already" | "invalid" = "invalid";

  if (token && token.length <= MAX_TOKEN_LENGTH) {
    const outcome = await consumeVerifyToken(token);
    status = outcome === "verified" ? "success" : outcome === "already-verified" ? "already" : "invalid";
  }

  const base = new URL(req.url).origin;
  return NextResponse.redirect(new URL(`${RESULT_PAGE}?status=${status}`, base), 303);
}

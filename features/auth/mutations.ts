import "server-only";

import dbConnect, { isDuplicateKeyError } from "@/lib/dbConnect";
import { usernameCandidates } from "@/lib/userIdentity";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/token";
import { randomBytes } from "node:crypto";
import User from "@/models/User";
import type { ClientSession } from "mongoose";

type MutationOptions = { session?: ClientSession };

type TokenIssue =
  | { outcome: "issued"; token: string; expiresAt: Date }
  | { outcome: "already-verified" }
  | { outcome: "already-pending" }
  | { outcome: "no-account" };

// Mints a single-use verification token and stores only its hash, so a dump of the
// collection never yields a usable link. The caller owns the send.
export async function issueVerifyToken(
  email: string,
  { session }: MutationOptions = {}
): Promise<TokenIssue> {
  await dbConnect();
  const opts = session ? { session } : {};

  const user = await User.findOne({ email })
    .select("emailVerified verifyToken")
    .session(session ?? null);

  if (user?.emailVerified) {
    return { outcome: "already-verified" };
  }

  // Don't re-send while a link is live: a second email creates two ways to fail.
  if (user?.verifyToken?.expiresAt && user.verifyToken.expiresAt > new Date()) {
    return { outcome: "already-pending" };
  }

  if (!user) {
    return { outcome: "no-account" };
  }

  const verifyToken = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await User.updateOne(
    { _id: user._id },
    { $set: { verifyToken: { token: hashToken(verifyToken), expiresAt } } },
    opts
  );

  return { outcome: "issued", token: verifyToken, expiresAt };
}

type VerifyConsume = "verified" | "already-verified" | "invalid";

// Consumes a verification link. The expiry check is load-bearing: without it an old
// mailed link would keep working indefinitely.
export async function consumeVerifyToken(
  token: string,
  { session }: MutationOptions = {}
): Promise<VerifyConsume> {
  await dbConnect();
  const opts = session ? { session } : {};

  const user = await User.findOne({ "verifyToken.token": hashToken(token) })
    .select("emailVerified verifyToken.expiresAt")
    .session(session ?? null)
    .lean<{
      _id?: unknown;
      emailVerified?: Date | null;
      verifyToken?: { expiresAt?: Date };
    } | null>();

  if (user?.emailVerified) {
    // Clearing stops a second click on a stale link from re-arming it.
    await User.updateOne({ _id: user._id }, { $unset: { verifyToken: 1 } }, opts);
    return "already-verified";
  }

  if (user?.verifyToken?.expiresAt && user.verifyToken.expiresAt > new Date()) {
    await User.updateOne(
      { _id: user._id },
      { $set: { emailVerified: new Date() }, $unset: { verifyToken: 1 } },
      opts
    );
    return "verified";
  }

  // Unknown token, or one that has expired.
  return "invalid";
}

type ResetIssue = { outcome: "issued"; token: string; expiresAt: Date } | { outcome: "skipped" };

// Issues a password-reset token. `skipped` covers both "no such account" and "not a
// credentials account" so the response cannot be used to enumerate addresses.
export async function issueResetToken(
  email: string,
  { session }: MutationOptions = {}
): Promise<ResetIssue> {
  await dbConnect();

  const user = await User.findOne({ email }).select("email provider").session(session ?? null);

  if (user?.provider !== "credentials") {
    return { outcome: "skipped" };
  }

  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await User.updateOne(
    { _id: user._id },
    { $set: { resetToken: { token: hashToken(resetToken), expiresAt } } },
    session ? { session } : {}
  );

  return { outcome: "issued", token: resetToken, expiresAt };
}

type ResetConsume = "reset" | "invalid";

// Redeems a reset link, which is itself proof of inbox control, so it doubles as
// verification.
export async function consumeResetToken(
  token: string,
  hashedPassword: string,
  { session }: MutationOptions = {}
): Promise<ResetConsume> {
  await dbConnect();
  const opts = session ? { session } : {};

  const user = await User.findOne({
    "resetToken.token": hashToken(token),
    "resetToken.expiresAt": { $gt: new Date() },
  })
    .select("emailVerified")
    .session(session ?? null)
    .lean<{ _id?: unknown; emailVerified?: Date | null } | null>();

  if (!user) {
    return "invalid";
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        emailVerified: user.emailVerified ?? new Date(),
        // Without this a stolen session cookie survives the change made to revoke it.
        sessionsInvalidBefore: new Date(),
      },
      $unset: { resetToken: 1 },
    },
    opts
  );

  return "reset";
}
// Clears a stored verify token without touching `emailVerified`, so a failed send does
// not suppress the cooldown and block a retry.
export async function clearVerifyToken(
  email: string,
  { session }: MutationOptions = {}
): Promise<void> {
  await dbConnect();
  await User.updateOne({ email }, { $unset: { verifyToken: 1 } }, session ? { session } : {});
}

type RegisterResult = "created" | "already-exists";

// Creates an account with an unused username derived from the member's name. The
// check-then-insert race is absorbed by the unique index, which surfaces as the same
// generic "already-exists" answer so the endpoint cannot probe which addresses exist.
export async function registerUser(
  account: { name: string; email: string; password: string; baseUsername: string },
  { session }: MutationOptions = {}
): Promise<RegisterResult> {
  await dbConnect();
  const opts = session ? { session } : {};

  const existing = await User.findOne({ email: account.email })
    .select("_id")
    .session(session ?? null)
    .lean<{ _id: unknown } | null>();

  if (existing) {
    return "already-exists";
  }

  let username: string | undefined;

  for (const candidate of usernameCandidates(account.baseUsername)) {
    // Model.exists() takes no options, so a session-aware check has to be a findOne.
    if (!(await User.findOne({ username: candidate }).select("_id").session(session ?? null))) {
      username = candidate;
      break;
    }
  }

  if (!username) {
    // Every candidate taken: a random suffix beats refusing over a name collision.
    username = `${account.baseUsername}-${randomBytes(3).toString("hex")}`;
  }

  try {
    await User.create(
      [
        {
          name: account.name,
          email: account.email,
          password: account.password,
          provider: "credentials",
          username,
        },
      ],
      opts
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return "already-exists";
    }
    throw error;
  }

  return "created";
}

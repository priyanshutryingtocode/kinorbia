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

  return "invalid";
}

type ResetIssue = { outcome: "issued"; token: string; expiresAt: Date } | { outcome: "skipped" };
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

export async function consumeResetToken(
  token: string,
  hashedPassword: string,
  { session }: MutationOptions = {}
): Promise<ResetConsume> {
  await dbConnect();
  const opts = session ? { session } : {};
  const tokenHash = hashToken(token);
  const now = new Date();

  const user = await User.findOne({
    "resetToken.token": tokenHash,
    "resetToken.expiresAt": { $gt: now },
  })
    .select("emailVerified")
    .session(session ?? null)
    .lean<{ _id?: unknown; emailVerified?: Date | null } | null>();

  if (!user) {
    return "invalid";
  }

  const result = await User.updateOne(
    {
      _id: user._id,
      "resetToken.token": tokenHash,
      "resetToken.expiresAt": { $gt: now },
    },
    {
      $set: {
        password: hashedPassword,
        emailVerified: user.emailVerified ?? now,
        sessionsInvalidBefore: now,
      },
      $unset: { resetToken: 1 },
    },
    opts
  );

  return result.modifiedCount === 1 ? "reset" : "invalid";
}

export async function clearVerifyToken(
  email: string,
  { session }: MutationOptions = {}
): Promise<void> {
  await dbConnect();
  await User.updateOne({ email }, { $unset: { verifyToken: 1 } }, session ? { session } : {});
}

type RegisterResult = "created" | "already-exists";

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
    if (!(await User.findOne({ username: candidate }).select("_id").session(session ?? null))) {
      username = candidate;
      break;
    }
  }

  if (!username) {
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

import { createHash } from "node:crypto";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect, { duplicateKeyField, isDuplicateKeyError } from "@/lib/dbConnect";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import { ensureUserIdentity, slugifyUsername, usernameCandidates } from "@/lib/userIdentity";

// Compared against when no user was found, so that a wrong password for an
// unknown address costs the same as one for a known account.

const DUMMY_BCRYPT_HASH = "$2b$10$vPZWNgvZy3FQD3F6MCWEmO1q.F9dWYWrRNZTaG5.AF93nQm2yDJU6";
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const LOGIN_ACCOUNT_RATE_LIMIT = { limit: 5, windowMs: 60_000 };
const MAX_USERNAME_ATTEMPTS = 10;

type AppToken = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  iat?: number;
  sessionExpired?: boolean;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }
        const ip = getClientIp(request);
        const limited =
          !(await rateLimit(`login:ip:${ip}`, LOGIN_RATE_LIMIT)) ||
          !(await rateLimit(
            `login:account:${createHash("sha256").update(email).digest("hex")}`,
            LOGIN_ACCOUNT_RATE_LIMIT
          ));

        if (limited) {
          return null;
        }

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase() })
          .select("+password name email image");

        const passwordMatches = await bcrypt.compare(
          password,
          user?.password || DUMMY_BCRYPT_HASH
        );

        if (!user?.password || !passwordMatches) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image } = user;
          if (!email) {
            return false;
          }
          const googleVerified = (profile as { email_verified?: unknown } | undefined)
            ?.email_verified;
          if (googleVerified === false) {
            return false;
          }

          await dbConnect();
          const normalizedEmail = email.toLowerCase();
          const existingUser = await User.findOne({ email: normalizedEmail });

          if (!existingUser) {
            const baseUsername = slugifyUsername(name || normalizedEmail.split("@")[0]);
            const candidates = usernameCandidates(baseUsername);
            let username = candidates.next().value;
            for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt += 1) {
              try {
                await User.create({
                  name: name || "KinOrbia user",
                  email: normalizedEmail,
                  image,
                  provider: "google",
                  emailVerified: new Date(),
                  username,
                });
                break;
              } catch (error) {
                if (!isDuplicateKeyError(error)) {
                  throw error;
                }
                if (duplicateKeyField(error) !== "username") {
                  return false;
                }

                username = candidates.next().value;
              }
            }
          } else {
            const setFields: Record<string, unknown> = {};
            if (!existingUser.image && image) {
              setFields.image = image;
            }

            if (!existingUser.username) {
              await ensureUserIdentity(normalizedEmail, existingUser.name || name || "KinOrbia user");
            }

            if (Object.keys(setFields).length > 0) {
              await User.updateOne({ _id: existingUser._id }, { $set: setFields });
            }
          }
        } catch (error) {
          console.error("Error saving Google user:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      const t = token as typeof token & AppToken;

      if (user?.email) {

        t.email = user.email.toLowerCase();
        t.name = user.name ?? null;
        t.picture = user.image ?? null;
        t.sessionExpired = false;

        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: t.email })
            .select("name image")
            .lean<{ name?: string; image?: string | null } | null>();
          if (dbUser) {
            t.name = dbUser.name ?? t.name;
            t.picture = dbUser.image ?? t.picture;
          }
        } catch (error) {
          console.error("Failed to hydrate session token:", error);
        }
        return t;
      }

      if (t.email) {
        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: t.email.toLowerCase() })
            .select("name image sessionsInvalidBefore username")
            .lean<{
              name?: string;
              image?: string | null;
              sessionsInvalidBefore?: Date | null;
              username?: string | null;
            } | null>();

          if (!dbUser) {
            t.sessionExpired = true;
            return t;
          }

          if (dbUser.sessionsInvalidBefore) {
            const issuedAtMs = (t.iat ?? 0) * 1000;
            if (issuedAtMs < dbUser.sessionsInvalidBefore.getTime()) {
              t.sessionExpired = true;
              return t;
            }
          }

          if (!dbUser.username) {
            // Legacy-account backfill
            await ensureUserIdentity(t.email.toLowerCase(), dbUser.name || "KinOrbia user");
          }

          t.sessionExpired = false;
          t.name = dbUser.name ?? t.name;
          t.picture = dbUser.image ?? t.picture;
        } catch (error) {
          console.error("Session verification failed; using cached token:", error);
        }
      }

      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & AppToken;

      if (t.sessionExpired) {
        session.user = {} as typeof session.user;
        return session;
      }

      if (typeof t.email === "string" && t.email) {
        session.user.email = t.email;
      }
      if (typeof t.name === "string" && t.name) {
        session.user.name = t.name;
      }
      if (typeof t.picture === "string" && t.picture) {
        session.user.image = t.picture;
      }

      return session;
    },
  },
});

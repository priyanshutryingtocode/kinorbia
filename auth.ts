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
//
// The cost factor must match the one the stored hashes were created with --
// bcrypt.compare takes its cost from the hash being compared against, not from
// a parameter. This said $2b$12$ while register and reset-password both hash at
// 10, which inverted the whole point: a wrong password for a *known* account
// ran 2^10 and finished in ~68ms, while an unknown email ran 2^12 and took
// ~259ms. That is a ~3.8x difference in the one direction the dummy hash exists
// to hide, and the per-IP limit of 10/min needs only a handful of samples to
// average out.
//
// Re-costing the prefix is safe: the salt and digest bytes are unchanged and
// bcrypt.compare still returns false rather than throwing.
const DUMMY_BCRYPT_HASH = "$2b$10$vPZWNgvZy3FQD3F6MCWEmO1q.F9dWYWrRNZTaG5.AF93nQm2yDJU6";

// Tighter per account than per IP, on purpose: the per-IP limit bounds one
// host, and the per-account limit is the one that actually holds when an
// attacker rotates addresses.
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const LOGIN_ACCOUNT_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

// A hard ceiling on the username-candidate walk. `usernameCandidates` never ends
// on its own, so without this any unexpected collision loop would be unbounded.
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
        // Trimmed, like `registerSchema` and `lib/session.ts` do, so a stray
        // trailing space in the form cannot make a valid address miss.
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        // Two limits, because one is not enough. Per-IP stops a single host
        // grinding; the tighter per-account limit is the one that actually
        // stops brute force, since an attacker rotates IPs trivially. The key is
        // hashed, so a leaked rate-limit store would not hand over a list of
        // registered addresses.
        //
        // `rateLimit` fails open, so a Redis outage removes this protection
        // rather than locking everyone out. That is a deliberate availability
        // trade-off, consistent with the rest of the app.
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
        // Projected rather than loading the whole document: this is the
        // highest-traffic read in the app, and User embeds `favorites` and
        // `watchlist` at up to 2,500 subdocuments each. `_id` comes back by
        // default, so the select covers the five fields actually read below.
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

          // Google asserts that it has verified the address. It is true in
          // practice, so this is defence in depth rather than a live gap -- but
          // email is the account-linking key here, so an unverified assertion
          // is exactly the case not to take on trust.
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
            // Same candidate sequence as the other two username sites; this one
            // advances on a duplicate-key error rather than polling `exists`.
            const candidates = usernameCandidates(baseUsername);
            let username = candidates.next().value;

            // Bounded, because `usernameCandidates` is an unbounded generator
            // and `isDuplicateKeyError` cannot tell the two unique fields apart
            // on its own. A username collision is fixed by advancing; an email
            // collision is not retryable, since every attempt carries the same
            // address -- two concurrent first-time sign-ins reach that case, and
            // the old loop retried it forever.
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

                // The account now exists, so the first request's `create` is the
                // one that succeeded. Nothing left to do but let this sign-in
                // end; the outer catch turns it into a normal rejection.
                if (duplicateKeyField(error) !== "username") {
                  return false;
                }

                username = candidates.next().value;
              }
            }
          } else {
            // Deliberately does NOT set `emailVerified` here.
            //
            // This callback runs *before* NextAuth's own account resolution, and
            // `allowDangerousEmailAccountLinking` is not enabled, so a Google
            // sign-in for an address that already has a password account is
            // rejected a moment later. Writing to it in the meantime would mark
            // an attacker's pre-registered account verified without the mailbox
            // ever being proven. Accounts that legitimately hold a linked Google
            // provider were created by the branch above, which does set it.
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
            // Account deleted since this token was issued.
            t.sessionExpired = true;
            return t;
          }

          if (dbUser.sessionsInvalidBefore) {
            const issuedAtMs = (t.iat ?? 0) * 1000;
            if (issuedAtMs < dbUser.sessionsInvalidBefore.getTime()) {
              // Password reset invalidated sessions issued before this time.
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
          // Fail open: a transient database problem should not log every
          // user out; cached token claims remain valid until they expire.
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

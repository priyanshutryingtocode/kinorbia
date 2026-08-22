import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { ensureUserIdentity, slugifyUsername } from "@/lib/userIdentity";

// A valid hash of an unrelated password. Compared against when the account
// doesn't exist so login timing doesn't reveal whether an email is registered.
const DUMMY_BCRYPT_HASH = "$2b$12$vPZWNgvZy3FQD3F6MCWEmO1q.F9dWYWrRNZTaG5.AF93nQm2yDJU6";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

type AppToken = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  iat?: number;
  sessionExpired?: boolean;
};

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

        // Always run bcrypt so timing doesn't leak account existence.
        const passwordMatches = await bcrypt.compare(
          password,
          user?.password || DUMMY_BCRYPT_HASH
        );

        if (!user?.password || !passwordMatches) {
          return null;
        }

        // Email verification is enforced; legacy accounts are migrated by
        // scripts/backfillEmailVerified.mjs (npm run backfill:verified).
        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image } = user;
          if (!email) {
            return false;
          }

          await dbConnect();
          const normalizedEmail = email.toLowerCase();
          const existingUser = await User.findOne({ email: normalizedEmail });

          if (!existingUser) {
            const baseUsername = slugifyUsername(name || normalizedEmail.split("@")[0]);
            let username = baseUsername;
            let suffix = 1;

            // Check-then-insert races fall back to suffixed retries until the
            // insert succeeds.
            for (;;) {
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
                username = `${baseUsername}-${suffix}`;
                suffix += 1;
              }
            }
          } else {
            const setFields: Record<string, unknown> = {};
            if (!existingUser.emailVerified) {
              // The email is verified by the Google provider itself.
              setFields.emailVerified = new Date();
            }
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
        // Sign-in hydration: cache the freshest profile values on the token.
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
            // Legacy-account backfill, kept rare by design.
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
        // Strip identity so all authenticated paths treat this as signed out.
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

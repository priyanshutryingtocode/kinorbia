import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

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

        if (!user?.password) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image } = user;
          if (!email) {
            return false;
          }

          await dbConnect();
          const existingUser = await User.findOne({ email: email.toLowerCase() });

          if (!existingUser) {
            await User.create({
              name: name || "KinOrbia user",
              email: email.toLowerCase(),
              image,
              provider: "google",
            });
          }
        } catch (error) {
          console.error("Error saving Google user:", error);
          return false;
        }
      }

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.image = dbUser.image;
        }
      }

      return session;
    },
  },
});

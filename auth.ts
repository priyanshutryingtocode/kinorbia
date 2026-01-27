import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image } = user;
          await dbConnect();
          
          // Check if user exists
          const existingUser = await User.findOne({ email });

          if (!existingUser) {
            // Create new user if they don't exist
            await User.create({
              name,
              email,
              image,
              provider: "google",
            });
          }
          return true; // Allow sign in
        } catch (error) {
          console.error("Error saving user to DB:", error);
          return false; // Deny sign in on error
        }
      }
      return true; // Allow other providers (like credentials)
    },
    
    // Ensure the session always has the latest data from DB
    async session({ session }) {
      if (session.user?.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.image = dbUser.image;
          // We can attach the bio here if we want it available everywhere
          // (session.user as any).bio = dbUser.bio; 
        }
      }
      return session;
    },
  },
});
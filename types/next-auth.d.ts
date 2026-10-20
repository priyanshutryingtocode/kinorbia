import type { DefaultSession } from "next-auth";

// The consent flag the media pages need to decide whether to prompt. It is read from the same
// User document as the rest of the session, so it costs no extra query -- see
// lib/sessionUser.ts.
declare module "next-auth" {
  interface Session {
    user: {
      shareActivityAsked?: boolean;
    } & DefaultSession["user"];
  }
}

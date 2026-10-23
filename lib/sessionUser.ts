import { cache } from "react";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

type SessionUserRecord = {
  name?: string;
  image?: string | null;
  sessionsInvalidBefore?: Date | null;
  username?: string | null;
  shareActivityAsked?: boolean;
};

export const loadSessionUser = cache(async (email: string): Promise<SessionUserRecord | null> => {
  await dbConnect();

  return User.findOne({ email })
    .select("name image sessionsInvalidBefore username shareActivityAsked")
    .lean<SessionUserRecord | null>();
});

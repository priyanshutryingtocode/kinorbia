import "server-only";

import dbConnect from "@/lib/dbConnect";
import Conversation, { MAX_CONVERSATION_MESSAGES } from "@/models/Conversation";
import type { MovieSummary } from "@/types";

export type Role = "user" | "assistant";

export type AssistantMessage = {
  role: Role;
  content: string;
};

export async function getHistory(email?: string | null): Promise<AssistantMessage[]> {
  if (!email) {
    return [];
  }

  await dbConnect();

  const conv = await Conversation.findOne({ userEmail: email })
    .select({ messages: { $slice: -8 } })
    .lean<{ messages?: { role: Role; content: string }[] } | null>();

  return (conv?.messages || []).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export async function persistConversation(
  email: string | null,
  userContent: string,
  assistantContent: string,
  movies: MovieSummary[]
) {
  if (!email) {
    return;
  }

  await dbConnect();
  await Conversation.updateOne(
    { userEmail: email },
    {
      $push: {
        messages: {
          $each: [
            { role: "user", content: userContent },
            { role: "assistant", content: assistantContent, movies },
          ],
          $slice: -MAX_CONVERSATION_MESSAGES,
        },
      },
    },
    { upsert: true }
  );
}


export async function getConversationMessages(
  email: string
): Promise<{ messages?: unknown[] } | null> {
  await dbConnect();
  return Conversation.findOne({ userEmail: email }).lean<{ messages?: unknown[] } | null>();
}

import "server-only";

import { type UserContext } from "@/lib/assistant/context";
import type { AssistantMessage } from "@/lib/assistant/conversation";

function parseGeminiJson(text: string): GeminiPlan {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(jsonText) as Partial<GeminiPlan>;

    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "Here are a few movies that fit.",
      titles: Array.isArray(parsed.titles)
        ? parsed.titles.filter((title): title is string => typeof title === "string").slice(0, 8)
        : [],
    };
  } catch {
    const replyMatch = cleaned.match(/"reply"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"titles"|"\s*})/);
    const titlesMatch = cleaned.match(/"titles"\s*:\s*\[([\s\S]*?)\]/);
    const titles = titlesMatch
      ? [...titlesMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]).slice(0, 8)
      : [];
    const fallbackReply = replyMatch?.[1]
      ?.replace(/\\"/g, "\"")
      .replace(/\\n/g, " ")
      .trim();

    return {
      reply: fallbackReply || "Here are a few movies that fit your request.",
      titles,
    };
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type GeminiPlan = {
  reply: string;
  titles: string[];
};

type GeminiSeed = {
  title?: string;
};

export async function getGeminiPlan(
  prompt: string,
  history: AssistantMessage[],
  context: UserContext,
  seed?: GeminiSeed,
  mediaType: "movie" | "tv" = "movie"
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const isTv = mediaType === "tv";
  const noun = isTv ? "TV show" : "movie";
  const nounPlural = isTv ? "TV shows" : "movies";

  const systemPrompt = [
    `You are KinOrbia's ${isTv ? "TV show" : "movie"} assistant.`,
    `Recommend ${nounPlural} based on the user's mood, constraints, and history.`,
    `Avoid recommending ${nounPlural} the user has already watched unless they explicitly ask for rewatches.`,
    `Return only JSON with this shape: {"reply":"short helpful response","titles":["${isTv ? "Show title" : "Movie title"}", "${isTv ? "Show title" : "Movie title"}"]}.`,
    `Use 3 to 6 ${noun} titles. Keep reply under 70 words.`,
  ].join(" ");

  const historyText = history.length
    ? history.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`).join("\n")
    : "No prior conversation.";

  const seedText = seed?.title
    ? `The user is likely referencing "${seed.title}". Prefer it as the starting point when relevant.`
    : "";

  const contextText = [
    `Favorites: ${context.favorites.map((movie) => `${movie.title}${movie.personalRating ? ` (${movie.personalRating}/10)` : ""}`).join(", ") || "none"}`,
    `Watched: ${context.watched.map((movie) => movie.title).join(", ") || "none"}`,
  ].join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\nUser context:\n${contextText}\n\n${seedText}\nRecent chat:\n${historyText}\n\nCurrent request:\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: { type: "STRING" },
              titles: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["reply", "titles"],
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Gemini request failed");
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return parseGeminiJson(text);
}


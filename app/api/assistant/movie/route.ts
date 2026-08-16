import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import Conversation, { MAX_CONVERSATION_MESSAGES } from "@/models/Conversation";
import { assistantPromptSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { searchMovies, getRecommendationMovies, searchTv, getTvRecommendations } from "@/lib/tmdb";
import type { FavoriteMovie, MovieSummary } from "@/types";

type Role = "user" | "assistant";

type AssistantMessage = {
  role: Role;
  content: string;
};

type GeminiPlan = {
  reply: string;
  titles: string[];
};

type GeminiSeed = {
  title?: string;
  movies: MovieSummary[];
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

function getReferencedTitle(prompt: string) {
  const quoted = prompt.match(/["“]([^"”]+)["”]/)?.[1];
  if (quoted) {
    return quoted.trim();
  }

  const likeMatch = prompt.match(/\b(?:like|similar to|after watching)\s+([a-z0-9 '&:.-]+?)(?:\s+but|\s+with|[,.!?]|$)/i)?.[1];
  return likeMatch?.trim() || "";
}

function hasQualifier(prompt: string) {
  const qualifiers = /\b(?:but|with|that|yet|more|less|not|without|instead|rather|though|however)\b/i;
  return qualifiers.test(prompt);
}

function isTvRequest(prompt: string) {
  return /\b(?:tv show|tv series|tv|series|show|shows|episode|season|bingewatch|binge-watch)\b/i.test(prompt);
}

async function getUserContext(email?: string | null) {
  if (!email) {
    return {
      favorites: [] as FavoriteMovie[],
      watched: [] as { movieTitle: string; rating?: number }[],
    };
  }

  await dbConnect();

  const [user, watched] = await Promise.all([
    User.findOne({ email }).lean<{ favorites?: FavoriteMovie[] } | null>(),
    JournalEntry.find({ userEmail: email })
      .sort({ watchedAt: -1 })
      .limit(20)
      .lean<{ movieTitle: string; rating?: number }[]>(),
  ]);

  return {
    favorites: (user?.favorites || []).slice(-15),
    watched,
  };
}

async function getGeminiPlan(
  prompt: string,
  history: AssistantMessage[],
  context: Awaited<ReturnType<typeof getUserContext>>,
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
    `Watched: ${context.watched.map((movie) => `${movie.movieTitle}${movie.rating ? ` (${movie.rating}/10)` : ""}`).join(", ") || "none"}`,
  ].join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

async function searchTmdbTitle(title: string, mediaType: "movie" | "tv" = "movie") {
  const data = mediaType === "tv" ? await searchTv(title) : await searchMovies(title);

  if (!data?.results?.length) {
    return null;
  }

  return data.results.find((movie) => movie.poster_path) || data.results[0];
}

async function getTmdbRecommendations(id: string, mediaType: "movie" | "tv" = "movie") {
  const data =
    mediaType === "tv" ? await getTvRecommendations(id) : await getRecommendationMovies(id);
  return (data?.results || []).slice(0, 6);
}

async function getHistory(email?: string | null): Promise<AssistantMessage[]> {
  if (!email) {
    return [];
  }

  await dbConnect();
  const conv = await Conversation.findOne({ userEmail: email }).lean<{
    messages?: { role: Role; content: string }[];
  } | null>();

  return (conv?.messages || []).slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function persistConversation(
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

function serializeMessages(messages: unknown[] = []) {
  return (messages as { role: Role; content: string; movies?: MovieSummary[] }[])
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role,
      content: message.content,
      movies: message.movies || undefined,
    }));
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email ? session.user.email.toLowerCase() : null;

  if (!email) {
    return NextResponse.json({ messages: [] });
  }

  await dbConnect();
  const conv = await Conversation.findOne({ userEmail: email }).lean<{ messages?: unknown[] }>();
  return NextResponse.json({ messages: serializeMessages(conv?.messages) });
}

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const body = await parseBody(req, assistantPromptSchema);

      if (!body) {
        return badRequest("Ask for the kind of movie you want to watch.");
      }

      const prompt = body.message;
      const mediaType = isTvRequest(prompt) ? "tv" : "movie";
      const session = await auth();
      const email = session?.user?.email ? session.user.email.toLowerCase() : null;
      const context = await getUserContext(email);

      const referencedTitle = getReferencedTitle(prompt);
      const referencedMovie = referencedTitle
        ? await searchTmdbTitle(referencedTitle, mediaType)
        : null;
      const referenceMovies = referencedMovie
        ? await getTmdbRecommendations(referencedMovie.id.toString(), mediaType)
        : [];

      if (referencedMovie && !hasQualifier(prompt) && referenceMovies.length > 0) {
        const reply =
          mediaType === "tv"
            ? `Here are a few shows similar to "${referencedMovie.title}".`
            : `Here are a few films similar to "${referencedMovie.title}".`;
        await persistConversation(email, prompt, reply, referenceMovies);
        return NextResponse.json({ reply, movies: referenceMovies });
      }

      const history = email
        ? await getHistory(email)
        : (body.history || [])
            .slice(-8)
            .map((message) => ({ role: message.role, content: message.content }));

      const plan = await getGeminiPlan(prompt, history, context, {
        title: referencedMovie?.title,
        movies: referenceMovies,
      }, mediaType);

      const settled = await Promise.allSettled(plan.titles.map((title) => searchTmdbTitle(title, mediaType)));
      const rawMovies = settled.map((result) => (result.status === "fulfilled" ? result.value : null));
      const seen = new Set<string>();
      let movies = rawMovies.filter((movie): movie is MovieSummary => {
        if (!movie || seen.has(movie.id.toString())) {
          return false;
        }

        seen.add(movie.id.toString());
        return true;
      });

      if (movies.length === 0) {
        movies = referenceMovies;
      }

      const reply = plan.reply;
      await persistConversation(email, prompt, reply, movies);

      return NextResponse.json({ reply, movies });
    } catch (error) {
      console.error("Movie assistant error:", error);

      if (error instanceof Error && error.message === "Missing GEMINI_API_KEY") {
        return NextResponse.json(
          { message: "Gemini is not configured. Add GEMINI_API_KEY to .env.local." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { message: "The assistant could not recommend movies right now." },
        { status: 500 }
      );
    }
  },
  { windowMs: 60 * 1000, limit: 2 }
);
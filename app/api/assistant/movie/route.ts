import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import type { FavoriteMovie, MovieSummary } from "@/types";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiPlan = {
  reply: string;
  titles: string[];
};

type TmdbSearchResponse = {
  results?: MovieSummary[];
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TMDB_RETRY_DELAY_MS = 350;

function getLatestUserMessage(messages: AssistantMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content.trim() || "";
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeFetch(url: string, init?: RequestInit, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt === retries) {
        console.error("Assistant fetch failed:", error);
        return null;
      }

      await sleep(TMDB_RETRY_DELAY_MS);
    }
  }

  return null;
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

async function getGeminiPlan(prompt: string, messages: AssistantMessage[], context: Awaited<ReturnType<typeof getUserContext>>) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const systemPrompt = [
    "You are KinOrbia's movie assistant.",
    "Recommend movies based on the user's mood, constraints, and history.",
    "Avoid recommending movies the user has already watched unless they explicitly ask for rewatches.",
    "Return only JSON with this shape: {\"reply\":\"short helpful response\",\"titles\":[\"Movie title\", \"Movie title\"]}.",
    "Use 3 to 6 movie titles. Keep reply under 70 words.",
  ].join(" ");

  const history = messages
    .slice(-6)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

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
                text: `${systemPrompt}\n\nUser context:\n${contextText}\n\nRecent chat:\n${history}\n\nCurrent request:\n${prompt}`,
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

async function searchTmdbTitle(title: string) {
  const res = await safeFetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}`,
    { next: { revalidate: 3600 } }
  );

  if (!res?.ok) {
    return null;
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return data.results?.find((movie) => movie.poster_path) || data.results?.[0] || null;
}

async function getTmdbRecommendations(movieId: string) {
  const res = await safeFetch(
    `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`,
    { next: { revalidate: 3600 } }
  );

  if (!res?.ok) {
    return [];
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return (data.results || []).slice(0, 6);
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages?: AssistantMessage[] };
    const normalizedMessages = Array.isArray(messages) ? messages : [];
    const prompt = getLatestUserMessage(normalizedMessages);

    if (!prompt) {
      return NextResponse.json({ message: "Ask for the kind of movie you want to watch." }, { status: 400 });
    }

    const session = await auth();
    const context = await getUserContext(session?.user?.email);
    const plan = await getGeminiPlan(prompt, normalizedMessages, context);
    const settledMovies = await Promise.allSettled(plan.titles.map(searchTmdbTitle));
    const rawMovies = settledMovies.map((result) => (result.status === "fulfilled" ? result.value : null));
    const seen = new Set<string>();
    let movies = rawMovies.filter((movie): movie is MovieSummary => {
      if (!movie || seen.has(movie.id.toString())) {
        return false;
      }

      seen.add(movie.id.toString());
      return true;
    });

    if (movies.length === 0) {
      const referencedTitle = getReferencedTitle(prompt);
      const referencedMovie = referencedTitle ? await searchTmdbTitle(referencedTitle) : null;
      movies = referencedMovie ? await getTmdbRecommendations(referencedMovie.id.toString()) : [];
    }

    return NextResponse.json({
      reply: plan.reply,
      movies,
    });
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
}

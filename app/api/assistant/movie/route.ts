import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assistantPromptSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { searchMovies, searchTv, getRecommendations } from "@/lib/tmdb";
import { getGeminiPlan } from "@/lib/assistant/gemini";
import { getReferencedTitle, hasQualifier, isTvRequest } from "@/lib/assistant/intent";
import { getUserContext } from "@/lib/assistant/context";
import {
  getConversationMessages,
  getHistory,
  persistConversation,
  type Role,
} from "@/lib/assistant/conversation";
import type { MovieSummary } from "@/types";
import { logger } from "@/lib/logger";


async function searchTmdbTitle(title: string, mediaType: "movie" | "tv" = "movie") {
  const data = mediaType === "tv" ? await searchTv(title) : await searchMovies(title);

  if (!data?.results?.length) {
    return null;
  }

  return data.results.find((movie) => movie.poster_path) || data.results[0];
}

async function getTmdbRecommendations(id: string, mediaType: "movie" | "tv" = "movie") {
  const data = await getRecommendations(id, mediaType);
  return (data?.results || []).slice(0, 6);
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

export const GET = withRateLimit(
  async () => {
    try {
      const session = await auth();
      const email = session?.user?.email ? session.user.email.toLowerCase() : null;

      if (!email) {
        return NextResponse.json({ messages: [] });
      }

      const conv = await getConversationMessages(email);
      return NextResponse.json({ messages: serializeMessages(conv?.messages) });
    } catch (error) {
      logger.error("Error loading assistant history:", { error: error });
      return NextResponse.json({ message: "Error loading assistant history" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120 }
);

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

      if (!email) {
        return NextResponse.json(
          { message: "Sign in to ask the movie assistant for recommendations." },
          { status: 401 }
        );
      }

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

      const history = await getHistory(email);

      const plan = await getGeminiPlan(
        prompt,
        history,
        context,
        { title: referencedMovie?.title },
        mediaType
      );

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
      logger.error("Movie assistant error:", { error: error });

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
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assistantPromptSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import {
  searchMovies,
  searchTv,
  getRecommendations,
  getPopularMovies,
  getPopularTv,
} from "@/lib/tmdb";
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

async function getFallbackRecommendations(
  mediaType: "movie" | "tv",
  referenceMovies: MovieSummary[],
  watchedTitles: string[]
) {
  const watched = new Set(watchedTitles.map((title) => title.trim().toLowerCase()));
  const selected = new Map<string, MovieSummary>();
  const addUnwatched = (candidates: MovieSummary[]) => {
    for (const movie of candidates) {
      if (!watched.has(movie.title.trim().toLowerCase())) {
        selected.set(movie.id.toString(), movie);
      }
      if (selected.size >= 6) break;
    }
  };

  addUnwatched(referenceMovies);
  if (selected.size < 6) {
    const popular = mediaType === "tv" ? await getPopularTv() : await getPopularMovies();
    addUnwatched(popular?.results || []);
  }

  return [...selected.values()];
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

      let plan: Awaited<ReturnType<typeof getGeminiPlan>>;
      try {
        plan = await getGeminiPlan(
          prompt,
          history,
          context,
          { title: referencedMovie?.title },
          mediaType
        );
      } catch (error) {
        logger.warn("Gemini unavailable; using TMDB fallback", {
          error: error instanceof Error ? error.message : String(error),
        });

        let movies: MovieSummary[];
        try {
          movies = await getFallbackRecommendations(
            mediaType,
            referenceMovies,
            context.watched.map((item) => item.title)
          );
        } catch (fallbackError) {
          logger.warn("TMDB assistant fallback failed", {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
          movies = [];
        }
        if (movies.length > 0) {
          const noun = mediaType === "tv" ? "shows" : "films";
          const reply = referencedMovie
            ? `I couldn't personalize picks right now, but here are some titles similar to "${referencedMovie.title}".`
            : `I couldn't personalize picks right now, but here are some popular ${noun} you might enjoy.`;
          await persistConversation(email, prompt, reply, movies);
          return NextResponse.json({ reply, movies, fallback: true });
        }

        return NextResponse.json(
          { message: "The assistant is unavailable and no recommendations could be loaded. Please try again shortly." },
          { status: 503 }
        );
      }

      const settled = await Promise.allSettled(
        plan.titles.map((title) => searchTmdbTitle(title, mediaType))
      );
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

      return NextResponse.json(
        { message: "The assistant could not recommend movies right now." },
        { status: 500 }
      );
    }
  },
  { windowMs: 60 * 1000, limit: 2 }
);

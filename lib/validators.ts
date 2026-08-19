import { z } from "zod";
import { NextResponse } from "next/server";

export const movieRefSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  voteAverage: z.coerce.number().min(0).max(10).optional().default(0),
  releaseDate: z.string().trim().max(40).nullish().transform((v) => v ?? null),
  mediaType: z.enum(["movie", "tv"]).optional().default("movie"),
  genreIds: z.array(z.number()).optional().default([]),
});

export const rateMovieSchema = movieRefSchema.extend({
  rating: z.coerce.number().min(1).max(10),
});

export const rateFavoriteSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  rating: z.coerce.number().min(1).max(10),
  mediaType: z.enum(["movie", "tv"]).optional().default("movie"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(160).optional().default(""),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(8).max(72),
});

export const addToListSchema = z.object({
  listId: z.string().min(1),
  movie: movieRefSchema,
});

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().max(2000),
});

export const assistantPromptSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(assistantMessageSchema).max(30).optional(),
  threadId: z.string().trim().max(120).optional(),
});

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function normalizeMovieRef(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw && typeof raw === "object" && !("movieTitle" in raw) && "title" in raw) {
    return { ...raw, movieTitle: raw.title };
  }
  return raw;
}

export async function parseMovieBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  try {
    const json = await req.json();
    const normalized = Array.isArray(json) ? json : normalizeMovieRef(json);
    const result = schema.safeParse(normalized);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function parseAddToListBody(req: Request): Promise<z.infer<typeof addToListSchema> | null> {
  try {
    const json = await req.json();
    const movie = json && typeof json === "object" && json.movie ? normalizeMovieRef(json.movie) : json?.movie;
    const result = addToListSchema.safeParse({ ...json, movie });
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function badRequest(message = "Invalid input.") {
  return NextResponse.json({ message }, { status: 400 });
}
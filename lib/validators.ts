import { z } from "zod";
import { NextResponse } from "next/server";

export const movieRefSchema = z.object({
  // Bounded, where every other client-supplied string here already was. This one
  // used to accept an arbitrary length and was written verbatim into the
  // embedded `favorites` / `watchlist` subdocuments of the User document. The
  // entry *count* is capped at 2,500 by lib/bounds.ts, but each entry was not
  // capped, so a handful of multi-megabyte ids was enough to push User past
  // MongoDB's 16 MB BSON limit -- after which every write to that account fails,
  // including the bcrypt update on a password reset, permanently bricking it.
  // TMDB ids are at most 10 digits; 64 leaves room for any id-shaped string.
  movieId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().max(64)),
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

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(160).optional().default(""),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(8).max(72),
});

export const assistantPromptSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

async function parseJson<T extends z.ZodType>(
  req: Request,
  schema: T,
  normalize?: (json: unknown) => unknown
): Promise<z.infer<T> | null> {
  try {
    const json = await req.json();
    const result = schema.safeParse(normalize ? normalize(json) : json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  return parseJson(req, schema);
}

function normalizeMovieRef(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !("movieTitle" in raw) && "title" in raw) {
    return { ...raw, movieTitle: raw.title };
  }
  return raw;
}

export function parseMovieBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  return parseJson(req, schema, (json) => (Array.isArray(json) ? json : normalizeMovieRef(json)));
}

export function badRequest(message = "Invalid input.") {
  return NextResponse.json({ message }, { status: 400 });
}

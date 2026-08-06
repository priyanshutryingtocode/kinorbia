import { z } from "zod";
import { NextResponse } from "next/server";

export const movieRefSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  voteAverage: z.coerce.number().min(0).max(10).optional().default(0),
  releaseDate: z.string().trim().max(40).nullish().transform((v) => v ?? null),
  personalRating: z.coerce.number().min(0).max(10).optional(),
});

export const rateMovieSchema = movieRefSchema.extend({
  rating: z.coerce.number().min(1).max(10),
});

export const rateFavoriteSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
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

export const addToListSchema = z.object({
  listId: z.string().min(1),
  movie: movieRefSchema,
});

export const assistantSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().max(2000),
      })
    )
    .min(1)
    .max(30),
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

export function badRequest(message = "Invalid input.") {
  return NextResponse.json({ message }, { status: 400 });
}
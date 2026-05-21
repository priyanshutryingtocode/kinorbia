"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import type { FavoriteMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createMovieList(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const title = getRequiredString(formData, "title");
  const description = getRequiredString(formData, "description");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const movieIds = formData.getAll("movieIds").filter((value): value is string => {
    return typeof value === "string" && value.length > 0;
  });

  if (!title) {
    return;
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  const favorites = (user?.favorites || []) as FavoriteMovie[];
  const selectedMovies = favorites.filter((movie) => movieIds.includes(movie.movieId));

  await MovieList.create({
    userEmail: session.user.email,
    userName: session.user.name || "KinOrbia user",
    title,
    description,
    movies: selectedMovies,
    visibility,
  });

  revalidatePath("/lists");
}

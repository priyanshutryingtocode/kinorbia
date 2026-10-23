import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import {
  listUserMedia,
  type LibraryFacets,
  type LibrarySort,
  type MediaState,
} from "@/features/media/userMovie";
import { logger } from "@/lib/logger";
import type { MediaType } from "@/types";


const STATES: readonly MediaState[] = ["favorite", "watchlist", "watched", "rated"];
const SORTS: readonly LibrarySort[] = ["recent", "rating", "title", "year"];

export const GET = withAuthedUser(
  async (req, { email }) => {
    const { searchParams } = new URL(req.url);
    const stateParam = searchParams.get("state") ?? "favorite";
    const typeParam = searchParams.get("type");
    const limit = Number(searchParams.get("limit") ?? 60);
    const skip = Number(searchParams.get("skip") ?? 0);

    if (!STATES.includes(stateParam as MediaState)) {
      return NextResponse.json(
        { message: `state must be one of ${STATES.join(", ")}` },
        { status: 400 }
      );
    }
    if (typeParam && typeParam !== "movie" && typeParam !== "tv") {
      return NextResponse.json({ message: "type must be movie or tv" }, { status: 400 });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return NextResponse.json({ message: "limit must be between 1 and 200" }, { status: 400 });
    }
    if (!Number.isInteger(skip) || skip < 0) {
      return NextResponse.json({ message: "skip must be zero or greater" }, { status: 400 });
    }

    const state = stateParam as MediaState;
    const sortParam = searchParams.get("sort") as LibrarySort | null;

    const genre = searchParams.get("genre");
    const minRating = searchParams.get("minRating");
    const year = searchParams.get("year");

    const facets: LibraryFacets = {};
    if (genre !== null) {
      const parsed = Number(genre);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json({ message: "genre must be a TMDB genre id" }, { status: 400 });
      }
      facets.genre = parsed;
    }
    if (minRating !== null) {
      const parsed = Number(minRating);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        return NextResponse.json({ message: "minRating must be between 0 and 10" }, { status: 400 });
      }
      facets.minRating = parsed;
    }
    if (year !== null) {
      const parsed = Number(year);
      if (!Number.isInteger(parsed) || parsed < 1870 || parsed > 2100) {
        return NextResponse.json({ message: "year must be between 1870 and 2100" }, { status: 400 });
      }
      facets.year = parsed;
    }
    if (sortParam !== null) {
      if (!SORTS.includes(sortParam)) {
        return NextResponse.json(
          { message: `sort must be one of ${SORTS.join(", ")}` },
          { status: 400 }
        );
      }
      facets.sort = sortParam;
    }

    try {
      const { rows, total } = await listUserMedia(email, state, {
        mediaType: (typeParam as MediaType | undefined) ?? undefined,
        skip,
        limit,
        facets,
      });
      return NextResponse.json({ rows, total, state, skip, limit, facets });
    } catch (error) {
      logger.error("library read failed", { state, typeParam, error });
      return NextResponse.json({ message: "Could not load your library." }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "loading library" }
);
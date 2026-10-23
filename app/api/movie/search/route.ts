import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import { fetchSearchResults, hasAnyFilter, type SearchFilters } from "@/lib/search";
import { logger } from "@/lib/logger";


export const GET = withRateLimit(
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const type = searchParams.get("type") === "tv" ? "tv" : "movie";
    const year = searchParams.get("year") ?? undefined;
    const genre = searchParams.get("genre") ?? undefined;
    const language = searchParams.get("language") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;
    const minRatingRaw = searchParams.get("minRating");
    const maxRuntime = searchParams.get("maxRuntime") ?? undefined;
    const minRating = minRatingRaw === null ? undefined : Number(minRatingRaw);

    if (minRating !== undefined && Number.isNaN(minRating)) {
      return NextResponse.json({ message: "minRating must be a number" }, { status: 400 });
    }

    const filters: SearchFilters = {
      query,
      year: year ?? "",
      genre: genre ?? "",
      language: language ?? "",
      sort: sort ?? "",
      minRating: minRating ?? 0,
      maxRuntime: maxRuntime ?? "",
      type,
    };

    if (!hasAnyFilter(filters)) {
      return NextResponse.json({
        results: [],
        hasMore: false,
        nextPage: 1,
        failed: false,
        undisplayable: false,
      });
    }

    try {
      return NextResponse.json(await fetchSearchResults(filters, 1));
    } catch (error) {
      logger.error("search failed", { type, error });
      return NextResponse.json({ message: "Search is unavailable." }, { status: 502 });
    }
  },

  { windowMs: 60 * 1000, limit: 40 }
);
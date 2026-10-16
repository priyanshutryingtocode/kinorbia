import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import { fetchSearchResults, hasAnyFilter, type SearchFilters } from "@/lib/search";
import { logger } from "@/lib/logger";

// TMDB search over HTTP.
//
// Every filter, the poster/date display filter and the page-fill loop come from
// fetchSearchResults -- this route only turns query-string values into its argument object
// and picks a page size. It is deliberately not "load more": the fill loop already returns a
// whole page, and the trimmed tail means an overlapping second page would be wrong.

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

    // minRating is a number and maxRuntime is a string in SearchFilters, so they are validated
    // for different reasons and must not be coerced into each other's shape.
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

    // fetchSearchResults answers "nothing to search for" with an empty list rather than a 400,
    // so the emptiness check is explicit here: an unfiltered browse is not a search. Shaped as
    // a full SearchPage -- nextPage included -- because a client cannot branch on a field that
    // only sometimes exists.
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
  // This route is public and each call spends a TMDB request against a metered key, so it is
  // rate limited by IP even though it needs no session. Generous, because one person typing
  // in a search box fires a request per keystroke -- the risk being bounded here is the key
  // running down, not the database.
  { windowMs: 60 * 1000, limit: 40 }
);
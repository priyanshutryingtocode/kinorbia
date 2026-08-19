import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  throw new Error("TMDB_API_KEY not set in environment.");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
await client.connect();

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
  {
    email: "demo1@kinorbia.dev",
    name: "Ava Moreno",
    username: "ava.moreno",
    bio: "Sci-fi nerd. I rate everything I watch and review the ones that leave a mark.",
    movieStart: 1,
    tvStart: 1,
    movieCount: 8,
    tvCount: 5,
    reviewCount: 5,
    listCount: 4,
    listOffset: 0,
    reviewOffset: 0,
  },
  {
    email: "demo2@kinorbia.dev",
    name: "Leo Kim",
    username: "leo.kim",
    bio: "Binge-watcher first, movie-goer second. Always down for a show recommendation.",
    movieStart: 3,
    tvStart: 0,
    movieCount: 5,
    tvCount: 8,
    reviewCount: 4,
    listCount: 3,
    listOffset: 2,
    reviewOffset: 2,
  },
  {
    email: "demo3@kinorbia.dev",
    name: "Maya Patel",
    username: "maya.patel",
    bio: "Collections curator and weekend rewatcher. My lists are my personality.",
    movieStart: 5,
    tvStart: 2,
    movieCount: 7,
    tvCount: 6,
    reviewCount: 5,
    listCount: 4,
    listOffset: 4,
    reviewOffset: 4,
  },
];

const MOVIE_TITLES = [
  "Project Hail Mary",
  "Disclosure Day",
  "Superman",
  "Avatar: Fire and Ash",
  "Mickey 17",
  "Wicked",
  "Dune: Part Two",
  "Oppenheimer",
  "Interstellar",
  "The Batman",
  "The Substance",
  "Anora",
  "Challengers",
  "The Brutalist",
  "Barbie",
  "The Odyssey",
];

const TV_TITLES = [
  "Severance",
  "Silo",
  "The Last of Us",
  "Stranger Things",
  "The Bear",
  "Andor",
  "Wednesday",
  "House of the Dragon",
];

const REVIEW_TEMPLATES = [
  "{title} completely exceeded my expectations. The pacing is tight, the performances are electric, and it earns every minute of its runtime. Already recommended it to everyone I know.",
  "I went in skeptical and came out a fan. {title} balances spectacle and heart in a way most films this size never manage. A must-watch.",
  "Rewatched {title} last night and it holds up beautifully. The craft on display is remarkable — sound, cinematography, the whole package.",
  "{title} is a slow burn, but the payoff is worth it. Give it time and let the story breathe; this one rewards patient viewers.",
  "There's a lot to love in {title} — great cast, gorgeous visuals — even if the third act wobbles a bit. Still a strong recommend.",
  "{title} made me feel something I wasn't expecting. It's ambitious, messy in places, and completely unforgettable.",
  "{title} is appointment viewing. Every episode ends on a cliffhanger and I could not stop hitting \"next\". Binge-worthy in the best way.",
  "The writing on {title} is exceptional. It rewards close attention and never talks down to its audience.",
];

const LIST_TITLES = [
  "2026 Sci-Fi Roundup",
  "Cozy Movie Night",
  "Sunday Binge",
  "Films That Stay With You",
  "My All-Time Favorites",
  "Underrated Gems",
  "Weekend Rewatches",
  "Shows I Binged in Record Time",
];

const LIST_DESCRIPTIONS = [
  "A hand-picked collection I keep coming back to.",
  "Perfect for a lazy weekend with snacks.",
  "Shows I binge-watched way too fast.",
  "Movies that left a mark on me.",
  "The essentials, no filler.",
  "Some favorites I never get tired of.",
  "Rotating comfort watch list.",
  "Grab the remote, clear your schedule.",
];

const JOURNAL_NOTES = [
  "Watched with friends — great time.",
  "Needed this one tonight.",
  "Still thinking about the ending.",
  "Rewatch, hits different the second time.",
  "First watch, absolutely loved it.",
  "Solid, would rewatch.",
  "",
  "",
];

const RATING_PATTERN = [9, 8, 10, 7, 6, 8, 7, 9, 5, 8, 6, 7, 10, 8];

const DAY_OFFSETS = [90, 78, 66, 54, 44, 35, 27, 20, 14, 10, 7, 6, 5, 4, 3, 2, 1, 0];

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(12, 0, 0, 0);
  return date;
}

function pickUnique(pool, start, count) {
  const out = [];
  const seen = new Set();
  let step = 0;

  while (out.length < count && step < pool.length * 4 && pool.length > 0) {
    const idx = (start + step) % pool.length;
    const item = pool[idx];
    if (!seen.has(item.movieId)) {
      seen.add(item.movieId);
      out.push(item);
    }
    step += 1;
  }

  return out;
}

async function tmdbSearch(endpoint, query) {
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.warn(`  TMDB search failed for "${query}": ${error?.message || error}`);
    return null;
  }
}

async function resolvePool(endpoint, titles) {
  const resolved = [];

  for (const title of titles) {
    const result = await tmdbSearch(endpoint, title);
    if (!result) {
      console.warn(`  Could not resolve "${title}" — skipping.`);
      continue;
    }

    resolved.push({
      movieId: String(result.id),
      title: result.title || result.name || title,
      posterPath: result.poster_path ?? null,
      voteAverage: result.vote_average ?? 0,
      releaseDate: result.release_date ?? result.first_air_date ?? undefined,
      originalLanguage: result.original_language ?? undefined,
      genreIds: Array.isArray(result.genre_ids) ? result.genre_ids : [],
      endpoint,
    });
  }

  return resolved;
}

function buildFavorites(userConfig, moviePool, tvPool) {
  const favorites = [];
  const used = new Set();

  const anchorMovie = moviePool[0];
  if (anchorMovie) {
    favorites.push({
      movieId: anchorMovie.movieId,
      title: anchorMovie.title,
      posterPath: anchorMovie.posterPath,
      voteAverage: anchorMovie.voteAverage,
      releaseDate: anchorMovie.releaseDate,
      personalRating: 8,
      mediaType: "movie",
      genreIds: anchorMovie.genreIds || [],
      addedAt: daysAgo(60),
    });
    used.add(anchorMovie.movieId);
  }

  const moviePicks = pickUnique(moviePool, userConfig.movieStart, userConfig.movieCount).filter(
    (movie) => !used.has(movie.movieId)
  );
  const tvPicks = pickUnique(tvPool, userConfig.tvStart, userConfig.tvCount).filter(
    (movie) => !used.has(movie.movieId)
  );

  let index = 1;
  for (const movie of [...moviePicks, ...tvPicks]) {
    const rating = index % 3 === 1 ? 0 : RATING_PATTERN[index % RATING_PATTERN.length];
    favorites.push({
      movieId: movie.movieId,
      title: movie.title,
      posterPath: movie.posterPath,
      voteAverage: movie.voteAverage,
      releaseDate: movie.releaseDate,
      personalRating: rating,
      mediaType: movie.endpoint === "tv" ? "tv" : "movie",
      genreIds: movie.genreIds || [],
      addedAt: daysAgo(90 - index * 4),
    });
    index += 1;
  }

  return favorites;
}

function buildWatchlist(userConfig, moviePool, tvPool) {
  const moviePicks = pickUnique(moviePool, userConfig.movieStart + 2, 2);
  const tvPicks = pickUnique(tvPool, userConfig.tvStart + 3, 2);

  return [...moviePicks, ...tvPicks].map((movie, i) => ({
    movieId: movie.movieId,
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseDate: movie.releaseDate,
    mediaType: movie.endpoint === "tv" ? "tv" : "movie",
    genreIds: movie.genreIds || [],
    addedAt: daysAgo(i * 2 + 1),
  }));
}

function buildJournal(userConfig, favorites) {
  const watched = favorites.filter((favorite) => favorite.personalRating > 0);
  const unrated = favorites.filter((favorite) => !favorite.personalRating);

  const ordered = [...watched, ...unrated].slice(0, DAY_OFFSETS.length);

  return ordered.map((favorite, i) => {
    const noteIndex = (i + userConfig.reviewOffset) % JOURNAL_NOTES.length;
    return {
      movieId: favorite.movieId,
      mediaType: favorite.mediaType || "movie",
      movieTitle: favorite.title,
      posterPath: favorite.posterPath,
      watchedAt: daysAgo(DAY_OFFSETS[i]),
      note: JOURNAL_NOTES[noteIndex],
    };
  });
}

function buildReviews(userConfig, favorites) {
  const rated = favorites.filter((favorite) => favorite.personalRating > 0);
  const picked = rated.slice(0, userConfig.reviewCount);

  return picked.map((favorite, i) => {
    const template = REVIEW_TEMPLATES[(i + userConfig.reviewOffset) % REVIEW_TEMPLATES.length];
    const visibility = i % 3 === 1 ? "private" : "public";

    return {
      movieId: favorite.movieId,
      mediaType: favorite.mediaType || "movie",
      movieTitle: favorite.title,
      posterPath: favorite.posterPath,
      body: template.replace("{title}", favorite.title),
      visibility,
      spoiler: i === 3,
      createdAt: daysAgo([20, 16, 12, 8, 4][i]),
    };
  });
}

function buildLists(userConfig, favorites) {
  const lists = [];

  for (let i = 0; i < userConfig.listCount; i += 1) {
    const titleIndex = (i + userConfig.listOffset) % LIST_TITLES.length;
    const descriptionIndex = (i + userConfig.listOffset) % LIST_DESCRIPTIONS.length;
    const visibility = i % 3 === 1 ? "private" : "public";

    const picked = pickUnique(favorites, i + 1, 3 + (i % 3));

    lists.push({
      title: LIST_TITLES[titleIndex],
      description: LIST_DESCRIPTIONS[descriptionIndex],
      visibility,
      createdAt: daysAgo([18, 11, 5, 1][i]),
      movies: picked.map((movie) => ({
        movieId: movie.movieId,
        mediaType: movie.mediaType || "movie",
        title: movie.title,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        releaseDate: movie.releaseDate,
      })),
    });
  }

  return lists;
}

function otherEmails(currentEmail) {
  return DEMO_USERS.filter((user) => user.email !== currentEmail).map((user) => user.email);
}

function addSocial(entry, currentEmail, seed) {
  const emails = otherEmails(currentEmail);

  if (seed % 3 !== 1) {
    entry.likedBy = [emails[seed % emails.length]];
  } else {
    entry.likedBy = [];
  }

  if (seed % 2 === 0) {
    entry.savedBy = [emails[(seed + 1) % emails.length]];
  } else {
    entry.savedBy = [];
  }
}

function buildConversation(moviePool, tvPool) {
  const recMovies = pickUnique(moviePool, 0, 3);
  const recShows = pickUnique(tvPool, 0, 2);

  const toAssistantMovie = (movie) => ({
    id: movie.movieId,
    title: movie.title,
    poster_path: movie.posterPath,
    release_date: movie.releaseDate,
    vote_average: movie.voteAverage,
    original_language: movie.originalLanguage,
    genre_ids: movie.genreIds,
  });

  return {
    messages: [
      {
        role: "user",
        content: "I loved Project Hail Mary, can you recommend something similar?",
        createdAt: daysAgo(3),
      },
      {
        role: "assistant",
        content: "If you liked Project Hail Mary, these should be right up your alley:",
        movies: recMovies.map(toAssistantMovie),
        createdAt: daysAgo(3),
      },
      {
        role: "user",
        content: "Great picks! How about a TV show along the same lines?",
        createdAt: daysAgo(2),
      },
      {
        role: "assistant",
        content: "Here are some shows you'll probably enjoy too:",
        movies: recShows.map(toAssistantMovie),
        createdAt: daysAgo(2),
      },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  };
}

let exitCode = 0;

try {
  const db = client.db();

  console.log("Resolving movies from TMDB...");
  const moviePool = await resolvePool("movie", MOVIE_TITLES);
  console.log(`Resolved ${moviePool.length}/${MOVIE_TITLES.length} movies.`);

  console.log("Resolving TV shows from TMDB...");
  const tvPool = await resolvePool("tv", TV_TITLES);
  console.log(`Resolved ${tvPool.length}/${TV_TITLES.length} shows.`);

  if (moviePool.length + tvPool.length === 0) {
    throw new Error(
      "Could not resolve any titles from TMDB. Check TMDB_API_KEY and network access before seeding."
    );
  }

  const demoEmails = DEMO_USERS.map((user) => user.email);

  await db.collection("journalentries").deleteMany({ userEmail: { $in: demoEmails } });
  await db.collection("reviews").deleteMany({ userEmail: { $in: demoEmails } });
  await db.collection("movielists").deleteMany({ userEmail: { $in: demoEmails } });
  await db.collection("conversations").deleteMany({ userEmail: { $in: demoEmails } });
  await db.collection("comments").deleteMany({ userEmail: { $in: demoEmails } });
  await db.collection("notifications").deleteMany({ userEmail: { $in: demoEmails } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  const insertedReviews = {};
  const insertedLists = {};

  for (const config of DEMO_USERS) {
    const favorites = buildFavorites(config, moviePool, tvPool);
    const watchlist = buildWatchlist(config, moviePool, tvPool);
    const journal = buildJournal(config, favorites);
    const reviews = buildReviews(config, favorites);
    const lists = buildLists(config, favorites);

    await db.collection("users").updateOne(
      { email: config.email },
      {
        $set: {
          name: config.name,
          email: config.email,
          password: passwordHash,
          image: null,
          username: config.username,
          bio: config.bio,
          provider: "credentials",
          emailVerified: now,
          favorites,
          watchlist,
          following: [],
        },
        $setOnInsert: { createdAt: now, updatedAt: now },
      },
      { upsert: true }
    );

    const journalDocs = journal.map((entry) => ({
      userEmail: config.email,
      userName: config.name,
      ...entry,
      createdAt: entry.watchedAt,
      updatedAt: entry.watchedAt,
    }));
    await db.collection("journalentries").insertMany(journalDocs);

    const reviewDocs = reviews.map((review, i) => {
      const doc = {
        userEmail: config.email,
        userName: config.name,
        movieId: review.movieId,
        mediaType: review.mediaType,
        movieTitle: review.movieTitle,
        posterPath: review.posterPath,
        body: review.body,
        visibility: review.visibility,
        spoiler: Boolean(review.spoiler),
        createdAt: review.createdAt,
        updatedAt: review.createdAt,
      };
      addSocial(doc, config.email, i);
      return doc;
    });
    const reviewInsert = await db.collection("reviews").insertMany(reviewDocs);
    insertedReviews[config.email] = reviewDocs.map((doc, i) => ({
      id: reviewInsert.insertedIds[i],
      ...doc,
    }));

    const listDocs = lists.map((list, i) => {
      const doc = {
        userEmail: config.email,
        userName: config.name,
        title: list.title,
        description: list.description,
        movies: list.movies,
        visibility: list.visibility,
        createdAt: list.createdAt,
        updatedAt: list.createdAt,
      };
      addSocial(doc, config.email, i + 1);
      return doc;
    });
    const listInsert = await db.collection("movielists").insertMany(listDocs);
    insertedLists[config.email] = listDocs.map((doc, i) => ({
      id: listInsert.insertedIds[i],
      ...doc,
    }));

    console.log(
      `  ${config.name.padEnd(12)} favorites=${favorites.length} watchlist=${watchlist.length} ` +
        `journal=${journalDocs.length} reviews=${reviewDocs.length} lists=${listDocs.length}`
    );
  }

  await db.collection("conversations").insertOne({
    userEmail: "demo1@kinorbia.dev",
    ...buildConversation(moviePool, tvPool),
  });

  const FOLLOW_MAP = {
    "demo1@kinorbia.dev": ["demo2@kinorbia.dev", "demo3@kinorbia.dev"],
    "demo2@kinorbia.dev": ["demo1@kinorbia.dev", "demo3@kinorbia.dev"],
    "demo3@kinorbia.dev": ["demo1@kinorbia.dev", "demo2@kinorbia.dev"],
  };

  for (const [email, following] of Object.entries(FOLLOW_MAP)) {
    await db.collection("users").updateOne({ email }, { $set: { following } });
  }

  const COMMENT_PLAN = [
    { from: "demo2@kinorbia.dev", parentUser: "demo1@kinorbia.dev", kind: "review", index: 0, body: "Totally agree — the ending still has me thinking.", createdAt: daysAgo(12) },
    { from: "demo3@kinorbia.dev", parentUser: "demo1@kinorbia.dev", kind: "review", index: 1, body: "Adding this to my watchlist tonight. Great write-up!", createdAt: daysAgo(9) },
    { from: "demo1@kinorbia.dev", parentUser: "demo2@kinorbia.dev", kind: "list", index: 0, body: "This list is basically my whole weekend plan.", createdAt: daysAgo(4) },
    { from: "demo2@kinorbia.dev", parentUser: "demo3@kinorbia.dev", kind: "review", index: 0, body: "You sold me on this one.", createdAt: daysAgo(2) },
  ];

  const commentDocs = COMMENT_PLAN.map((plan) => {
    const parents = plan.kind === "review" ? insertedReviews : insertedLists;
    const parent = parents[plan.parentUser][plan.index];
    const author = DEMO_USERS.find((user) => user.email === plan.from);
    return {
      parentType: plan.kind,
      parentId: parent.id,
      userEmail: plan.from,
      userName: author.name,
      body: plan.body,
      createdAt: plan.createdAt,
      updatedAt: plan.createdAt,
    };
  });

  if (commentDocs.length > 0) {
    await db.collection("comments").insertMany(commentDocs);
  }

  const byEmail = Object.fromEntries(DEMO_USERS.map((user) => [user.email, user]));
  const notif = (userEmail, type, actor, targetType, parent, read, days) => ({
    userEmail,
    type,
    actorEmail: actor.email,
    actorName: actor.name,
    targetType,
    targetId: parent ? parent.id.toString() : actor.email,
    targetTitle: parent ? parent.movieTitle || parent.title || "" : actor.username,
    movieId: parent ? parent.movieId || "" : "",
    mediaType: parent && parent.movieId ? parent.mediaType || "movie" : "movie",
    read,
    createdAt: daysAgo(days),
  });

  const notifications = [
    notif("demo1@kinorbia.dev", "follow", byEmail["demo2@kinorbia.dev"], "user", null, false, 14),
    notif("demo1@kinorbia.dev", "like", byEmail["demo3@kinorbia.dev"], "review", insertedReviews["demo1@kinorbia.dev"][0], false, 11),
    notif("demo1@kinorbia.dev", "comment", byEmail["demo2@kinorbia.dev"], "review", insertedReviews["demo1@kinorbia.dev"][0], false, 8),
    notif("demo1@kinorbia.dev", "save", byEmail["demo2@kinorbia.dev"], "list", insertedLists["demo1@kinorbia.dev"][0], true, 6),
    notif("demo2@kinorbia.dev", "follow", byEmail["demo1@kinorbia.dev"], "user", null, false, 15),
    notif("demo2@kinorbia.dev", "like", byEmail["demo1@kinorbia.dev"], "review", insertedReviews["demo2@kinorbia.dev"][0], false, 7),
    notif("demo2@kinorbia.dev", "comment", byEmail["demo3@kinorbia.dev"], "list", insertedLists["demo2@kinorbia.dev"][0], true, 3),
    notif("demo3@kinorbia.dev", "follow", byEmail["demo1@kinorbia.dev"], "user", null, false, 15),
    notif("demo3@kinorbia.dev", "like", byEmail["demo1@kinorbia.dev"], "review", insertedReviews["demo3@kinorbia.dev"][0], false, 5),
  ];

  await db.collection("notifications").insertMany(notifications);

  const totals = {};
  for (const name of ["users", "journalentries", "reviews", "movielists", "conversations", "comments", "notifications"]) {
    totals[name] = await db.collection(name).countDocuments({});
  }

  console.log("\nSeed complete.");
  console.log(
    `Totals -> users:${totals.users} journalentries:${totals.journalentries} ` +
      `reviews:${totals.reviews} movielists:${totals.movielists} conversations:${totals.conversations} ` +
      `comments:${totals.comments} notifications:${totals.notifications}`
  );
  console.log(`\nDemo login (all): ${DEMO_PASSWORD}`);
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email}  (${user.username})`);
  }
  console.log("\nRe-run anytime to reset the demo data.");
} catch (error) {
  exitCode = 1;
  console.error("\nSeed failed:", error?.message || error);
} finally {
  await client.close();
}

process.exit(exitCode);

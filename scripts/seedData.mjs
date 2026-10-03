import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const ASSUME_YES = argv.has("--yes");

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  throw new Error("TMDB_API_KEY not set in environment.");
}

const DEMO_PASSWORD = "demo1234";

// Every id is generated up front so the comment and notification documents can
// point at their parents before anything is written. That is also what lets
// --dry-run build the entire graph without ever opening a Mongo connection.
const newId = () => new ObjectId();

// Both mongoose and the raw driver fall back to "test" when the URI carries no
// database name, so resolve it explicitly rather than writing to "whatever the
// driver defaulted to" -- the confirmation prompt has to name the real target.
const DEFAULT_DATABASE = "test";

function describeTarget(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const name = parsed.pathname.replace(/^\//, "").split("?")[0];
    return {
      host: parsed.host,
      database: name || DEFAULT_DATABASE,
    };
  } catch {
    return { host: "unparseable URI", database: DEFAULT_DATABASE };
  }
}

// Deterministic RNG so a re-run reproduces the same demo data.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    between(min, maxInclusive) {
      return min + Math.floor(next() * (maxInclusive - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    chance(probability) {
      return next() < probability;
    },
    shuffled(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

const SCIFI = [878, 10765];
const DARK = [53, 80, 27, 9648];
const ARTSY = [18, 99, 36, 10749, 10768];
const LIGHT = [35, 16, 10751, 14, 10762];
const ACTION = [28, 12, 10759];

// Volume targets. The UI paginates favorites/watchlist at 20 and reviews/lists
// at 9, and Insights plots a rolling 12-month chart, so every per-user number
// here sits above the threshold it needs to clear.
const FAVORITES_PER_USER = 30;
const WATCHLIST_PER_USER = 30;
const REVIEWS_PER_USER = 15;
const LISTS_PER_USER = 14;
const JOURNAL_PER_USER = 45;
const JOURNAL_SPAN_DAYS = 430;

const DEMO_USERS = [
  {
    email: "demo1@kinorbia.dev",
    name: "Ava Moreno",
    username: "ava.moreno",
    bio: "Sci-fi nerd. I rate everything I watch and review the ones that leave a mark.",
    affinity: SCIFI,
    movieRatio: 0.7,
    ratingBias: 0.4,
    followCount: 7,
    popularity: 9,
    seed: 11,
  },
  {
    email: "demo2@kinorbia.dev",
    name: "Leo Kim",
    username: "leo.kim",
    bio: "Binge-watcher first, movie-goer second. Always down for a show recommendation.",
    affinity: [10765, 10759, 18],
    movieRatio: 0.35,
    ratingBias: 0,
    followCount: 5,
    popularity: 7,
    seed: 22,
  },
  {
    email: "demo3@kinorbia.dev",
    name: "Maya Patel",
    username: "maya.patel",
    bio: "Collections curator and weekend rewatcher. My lists are my personality.",
    affinity: ARTSY,
    movieRatio: 0.75,
    ratingBias: 0.2,
    followCount: 6,
    popularity: 8,
    seed: 33,
  },
  {
    email: "demo4@kinorbia.dev",
    name: "Noor Haddad",
    username: "noor.haddad",
    bio: "Horror devotee. If the poster is unsettling I'm already watching it.",
    affinity: [27, 53, 878],
    movieRatio: 0.8,
    ratingBias: -0.5,
    followCount: 4,
    popularity: 6,
    seed: 44,
  },
  {
    email: "demo5@kinorbia.dev",
    name: "Tomas Vidal",
    username: "tomas.vidal",
    bio: "Festival films and slow cinema. Subtitles don't scare me.",
    affinity: [99, 36, 18],
    movieRatio: 0.9,
    ratingBias: 0.6,
    followCount: 5,
    popularity: 5,
    seed: 55,
  },
  {
    email: "demo6@kinorbia.dev",
    name: "Ingrid Solberg",
    username: "ingrid.solberg",
    bio: "Animation everything. Ghibli era through to the current wave.",
    affinity: LIGHT,
    movieRatio: 0.5,
    ratingBias: 0.5,
    followCount: 6,
    popularity: 7,
    seed: 66,
  },
  {
    email: "demo7@kinorbia.dev",
    name: "Ren Takahashi",
    username: "ren.takahashi",
    bio: "Crime thrillers and true-crime docs. I want the twist to hurt.",
    affinity: DARK,
    movieRatio: 0.6,
    ratingBias: -0.1,
    followCount: 7,
    popularity: 8,
    seed: 77,
  },
  {
    email: "demo8@kinorbia.dev",
    name: "Camille Duarte",
    username: "camille.duarte",
    bio: "Romance, melodrama, and the occasional musical. No apologies.",
    affinity: [10749, 10402, 18, 35],
    movieRatio: 0.85,
    ratingBias: 0.3,
    followCount: 8,
    popularity: 9,
    seed: 88,
  },
  {
    email: "demo9@kinorbia.dev",
    name: "Oscar Lindqvist",
    username: "oscar.lindqvist",
    bio: "Documentaries, history, and anything with a strong archival spine.",
    affinity: [99, 36, 10768],
    movieRatio: 0.7,
    ratingBias: 0.4,
    followCount: 3,
    popularity: 4,
    seed: 99,
  },
  {
    email: "demo10@kinorbia.dev",
    name: "Priya Raman",
    username: "priya.raman",
    bio: "Watches far too much of everything. My profile is an unhinged spreadsheet.",
    affinity: [...SCIFI, ...DARK, ...ACTION],
    movieRatio: 0.6,
    ratingBias: -0.2,
    followCount: 9,
    popularity: 10,
    seed: 101,
  },
];

const REVIEW_TEMPLATES = [
  "{title} completely exceeded my expectations. The pacing is tight, the performances are electric, and it earns every minute of its runtime.",
  "I went in skeptical and came out a fan. {title} balances spectacle and heart in a way most films this size never manage.",
  "Rewatched {title} last night and it holds up beautifully. The craft on display is remarkable — sound, cinematography, the whole package.",
  "{title} is a slow burn, but the payoff is worth it. Give it time and let the story breathe.",
  "There's a lot to love in {title} — great cast, gorgeous visuals — even if the third act wobbles a bit.",
  "{title} made me feel something I wasn't expecting. Ambitions, messy in places, and completely unforgettable.",
  "{title} is appointment viewing. Every episode ends on a cliffhanger and I could not stop hitting next.",
  "The writing on {title} is exceptional. It rewards close attention and never talks down to its audience.",
  "{title} is the rare film that is exactly as good as everyone said it was.",
  "Gave {title} a chance on a boring evening and ended up watching it twice in a row.",
  "{title} has one flaw and it is that it isn't longer.",
  "I keep thinking about {title} a week later. That does not happen to me often.",
];

const LIST_TITLES = [
  "Quiet Films for Loud Weeks",
  "The 90s, Revisited",
  "Start Here If You Like Slow Burn",
  "Perfect Cold Weather Watchlist",
  "Every Frame Is a Photograph",
  "Things I Watched Instead of Sleeping",
  "Best First Impressions",
  "Villains Who Actually Won",
  "Comfort Rewatches",
  "Under 100 Minutes, Overstuffed",
  "Soundtracks I Have on Vinyl",
  "Late Night Horror Rotation",
  "Debuts That Landed",
  "Pairs to Watch Back to Back",
];

const LIST_DESCRIPTIONS = [
  "A hand-picked collection I keep coming back to.",
  "For when the weekend needs a plan and you need it to be short.",
  "Everything here rewards patience.",
  "Shows I binge-watched way too fast.",
  "Films that stayed with me longer than expected.",
  "The essentials, no filler.",
  "Rotating comfort watch list.",
  "Grab the remote, clear your schedule.",
];

const COMMENT_BODIES = [
  "This is exactly the take I needed to hear.",
  "Adding this to my watchlist right now.",
  "Strongly agree on the pacing point — it never rushes.",
  "The third act does wobble, but the ending redeems it.",
  "How did you find this? It completely passed me by.",
  "Your rating is generous, that third act did not work for me.",
  "This is a great pick for a cold evening.",
  "I rewatched this last month and it held up even better.",
  "Bookmarking this whole list.",
  "The performances carry it more than the script does.",
  "I went in with no expectations and left a fan.",
  "This one deserves way more attention than it gets.",
];

const BASE_RATINGS = [10, 9, 8, 8, 7, 9, 6, 8, 10, 7, 5, 8, 9, 6, 7, 10, 8, 9, 7, 8];

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(12, 0, 0, 0);
  return date;
}

// Biases older entries towards the recent past so the monthly chart, the
// current streak and the best streak all have a realistic shape.
function spreadDates(count, spanDays, rng) {
  const offsets = [];
  for (let i = 0; i < count; i += 1) {
    const progress = count === 1 ? 0 : i / (count - 1);
    const base = spanDays * Math.pow(1 - progress, 1.9);
    const jitter = rng.between(-3, 4);
    offsets.push(Math.max(0, Math.round(base + jitter)));
  }
  return offsets.sort((a, b) => b - a);
}

async function tmdbPage(path, page) {
  const url = `https://api.themoviedb.org/3${path}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`  TMDB ${path} page ${page} -> HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.warn(`  TMDB ${path} page ${page} failed: ${error?.message || error}`);
    return [];
  }
}

// Paging the list endpoints rather than searching by name is what puts
// genre_ids on every record. The old per-title /search/... path returned no
// genre_ids at all, which left the Insights genre breakdown empty.
async function fetchPool({ mediaType, sources, target }) {
  const seen = new Set();
  const pool = [];

  for (const source of sources) {
    for (let page = 1; page <= source.pages; page += 1) {
      const results = await tmdbPage(source.path, page);
      if (results.length === 0) break;

      for (const item of results) {
        const movieId = String(item.id);
        if (seen.has(movieId)) continue;
        if (!item.poster_path) continue;
        if (!item.vote_average) continue;

        const releaseDate = item.release_date ?? item.first_air_date;
        if (!releaseDate) continue;

        seen.add(movieId);
        pool.push({
          movieId,
          title: item.title || item.name || "Untitled",
          posterPath: item.poster_path,
          voteAverage: Number(item.vote_average.toFixed(1)),
          releaseDate,
          originalLanguage: item.original_language ?? undefined,
          genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
          mediaType,
        });
      }
    }

    if (pool.length >= target) break;
  }

  return pool;
}

// The media mix is per-persona rather than a fixed ratio so profiles differ
// instead of all trending the same way.
function affinityScore(item, affinity) {
  return item.genreIds.filter((id) => affinity.includes(id)).length;
}

function buildLibrary(pool, config, rng, { exclude, count }) {
  const excluded = new Set(exclude);
  const candidates = pool.filter((item) => !excluded.has(item.movieId));
  if (candidates.length === 0) return [];

  const movieCount = Math.max(1, Math.round(count * config.movieRatio));
  const tvCount = Math.max(1, count - movieCount);

  const byAffinity = [...candidates].sort(
    (a, b) => affinityScore(b, config.affinity) - affinityScore(a, config.affinity)
  );
  // Rotate a random slice of the affinity ordering so users with similar
  // tastes still end up with different libraries.
  const offset = rng.int(Math.max(1, byAffinity.length));
  const rotated = [...byAffinity.slice(offset), ...byAffinity.slice(0, offset)];

  const takeByType = (type, want) => {
    const taken = [];
    const outOfType = [];
    for (const item of rotated) {
      if (taken.length >= want) break;
      if (item.mediaType === type) taken.push(item);
      else outOfType.push(item);
    }
    return { taken, outOfType };
  };

  const movies = takeByType("movie", movieCount);
  const shows = takeByType("tv", tvCount);

  const chosen = [...movies.taken, ...shows.taken];
  const needed = count - chosen.length;
  if (needed > 0) {
    const leftovers = [...movies.outOfType, ...shows.outOfType].filter(
      (item) => !chosen.some((c) => c.movieId === item.movieId)
    );
    chosen.push(...leftovers.slice(0, needed));
  }

  return rng.shuffled(chosen).slice(0, count);
}

function personalRatingFor(rng, config) {
  const base = rng.pick(BASE_RATINGS);
  return Math.max(1, Math.min(10, Math.round(base + config.ratingBias)));
}

function buildFavorites(pool, config, rng) {
  const items = buildLibrary(pool, config, rng, {
    exclude: [],
    count: FAVORITES_PER_USER,
  });

  const dates = spreadDates(items.length, JOURNAL_SPAN_DAYS, rng);

  return items.map((item, index) => {
    // Unrated favourites keep the Insights rating distribution honest.
    const rating = rng.chance(0.14) ? 0 : personalRatingFor(rng, config);

    return {
      movieId: item.movieId,
      title: item.title,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      releaseDate: item.releaseDate,
      personalRating: rating,
      mediaType: item.mediaType,
      genreIds: item.genreIds,
      addedAt: daysAgo(dates[index] ?? rng.between(5, 400)),
    };
  });
}

function buildWatchlist(pool, config, rng, favorites) {
  const items = buildLibrary(pool, config, rng, {
    exclude: favorites.map((favorite) => favorite.movieId),
    count: WATCHLIST_PER_USER,
  });

  const dates = spreadDates(items.length, 210, rng);

  return items.map((item, index) => ({
    movieId: item.movieId,
    title: item.title,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    releaseDate: item.releaseDate,
    mediaType: item.mediaType,
    genreIds: item.genreIds,
    addedAt: daysAgo(dates[index] ?? rng.between(1, 200)),
  }));
}

// Journal entries are their own draw rather than a slice of favourites: the
// Insights watch counts come from here, so they have to exceed the library.
function buildJournal(favorites, pool, config, rng) {
  const journalDates = spreadDates(JOURNAL_PER_USER, JOURNAL_SPAN_DAYS, rng);

  const ordered = [
    ...favorites.filter((favorite) => favorite.personalRating > 0),
    ...favorites.filter((favorite) => !favorite.personalRating),
  ];

  const entries = [];
  const used = new Set();

  const take = (item) => {
    if (!item || used.has(item.movieId)) return false;
    used.add(item.movieId);
    entries.push(item);
    return true;
  };

  for (const favorite of ordered) {
    if (entries.length >= JOURNAL_PER_USER) break;
    take(favorite);
  }

  // Top up from watchlist, then from the wider pool, so the journal can run
  // past the favourites without ever repeating a title (watchedAt is unique).
  const leftovers = buildLibrary(
    pool,
    config,
    rng,
    { exclude: [...used], count: JOURNAL_PER_USER - entries.length }
  );
  for (const item of leftovers) {
    if (entries.length >= JOURNAL_PER_USER) break;
    take(item);
  }

  return entries.map((item, index) => ({
    movieId: item.movieId,
    mediaType: item.mediaType,
    movieTitle: item.title,
    posterPath: item.posterPath,
    watchedAt: daysAgo(journalDates[index] ?? rng.between(0, JOURNAL_SPAN_DAYS)),
  }));
}

function buildReviews(favorites, config, rng) {
  const rated = rng.shuffled(favorites.filter((favorite) => favorite.personalRating > 0));
  const picked = rated.slice(0, REVIEWS_PER_USER);
  const dates = spreadDates(picked.length, 400, rng);

  return picked.map((favorite, index) => {
    const template = REVIEW_TEMPLATES[(index + config.seed) % REVIEW_TEMPLATES.length];

    return {
      _id: newId(),
      userEmail: config.email,
      userName: config.name,
      movieId: favorite.movieId,
      mediaType: favorite.mediaType,
      movieTitle: favorite.title,
      posterPath: favorite.posterPath,
      body: template.replace("{title}", favorite.title),
      // Roughly one review in five stays private so the public feed is not
      // uniformly "everything is public".
      visibility: index % 5 === 1 ? "private" : "public",
      spoiler: index % 7 === 3,
      createdAt: daysAgo(dates[index] ?? 30),
      updatedAt: daysAgo(dates[index] ?? 30),
    };
  });
}

function buildLists(favorites, watchlist, config, rng) {
  const source = [...favorites, ...watchlist];
  const lists = [];
  const usedTitles = new Set();

  for (let index = 0; index < LISTS_PER_USER; index += 1) {
    const titleIndex = (index + config.seed) % LIST_TITLES.length;
    const descriptionIndex = (index + config.seed) % LIST_DESCRIPTIONS.length;
    const visibility = index % 6 === 1 ? "private" : "public";
    const size = rng.between(4, 8);

    const picked = [];
    for (const candidate of rng.shuffled(source)) {
      if (picked.length >= size) break;
      if (picked.some((item) => item.movieId === candidate.movieId)) continue;
      picked.push(candidate);
    }
    if (picked.length < 4) continue;

    // Titles are shared across personas, so a user must not end up with two
    // lists called the same thing.
    const baseTitle = LIST_TITLES[titleIndex];
    let title = baseTitle;
    let bump = 2;
    while (usedTitles.has(title)) {
      title = `${baseTitle} (${bump})`;
      bump += 1;
    }
    usedTitles.add(title);

    const dates = spreadDates(1, 380, rng);
    lists.push({
      _id: newId(),
      userEmail: config.email,
      userName: config.name,
      title,
      description: LIST_DESCRIPTIONS[descriptionIndex],
      movies: picked.map((item) => ({
        movieId: item.movieId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        voteAverage: item.voteAverage,
        releaseDate: item.releaseDate,
      })),
      visibility,
      createdAt: daysAgo(dates[0] ?? 60),
      updatedAt: daysAgo(dates[0] ?? 60),
    });
  }

  return lists;
}

// Weighted by persona popularity so the demo followers are not all equal.
function weightedActors(rng, authorEmail, candidates, max = 6, min = 1) {
  const pool = candidates.filter((user) => user.email !== authorEmail);
  const totalWeight = pool.reduce((sum, user) => sum + user.popularity, 0);
  if (totalWeight === 0) return [];

  const actorCount = Math.min(pool.length, rng.between(Math.min(min, max), max));
  const chosen = [];

  for (let attempt = 0; attempt < max * 10 && chosen.length < actorCount; attempt += 1) {
    // Weight only the people still available, otherwise the ticket is measured
    // against weights that are then skipped and the draw usually fails.
    const remaining = pool.filter((user) => !chosen.some((c) => c.email === user.email));
    if (remaining.length === 0) break;

    const remainingWeight = remaining.reduce((sum, user) => sum + user.popularity, 0);
    let ticket = rng.next() * remainingWeight;

    for (const user of remaining) {
      ticket -= user.popularity;
      if (ticket <= 0) {
        chosen.push(user);
        break;
      }
    }
  }

  return chosen;
}

function buildSocial(users, reviews, lists, rng) {
  const notifications = [];
  const comments = [];

  const applyActors = (doc, actors) => {
    doc.likedBy = actors.map((actor) => actor.email);
    doc.savedBy = [];
    return actors;
  };

  for (const doc of [...reviews, ...lists]) {
    // Private content gets no engagement at all.
    if (doc.visibility !== "public") {
      doc.likedBy = [];
      doc.savedBy = [];
      continue;
    }

    const rngLocal = makeRng(rng.int(1_000_000));
    const likers = applyActors(doc, weightedActors(rngLocal, doc.userEmail, users));
    const savers = weightedActors(rngLocal, doc.userEmail, users).slice(
      0,
      Math.max(0, Math.min(2, likers.length))
    );
    doc.savedBy = savers.map((saver) => saver.email);

    const targetType = doc.movieId ? "review" : "list";
    const targetTitle = doc.movieTitle || doc.title;
    const actedAt = doc.createdAt;

    for (const actor of likers) {
      notifications.push({
        userEmail: doc.userEmail,
        type: "like",
        actorEmail: actor.email,
        actorName: actor.name,
        targetType,
        targetId: doc._id.toString(),
        targetTitle,
        movieId: doc.movieId || "",
        mediaType: doc.mediaType || "movie",
        read: false,
        createdAt: new Date(Math.max(0, actedAt.getTime() + rngLocal.between(1, 400) * 60000)),
      });
    }

    for (const actor of savers) {
      notifications.push({
        userEmail: doc.userEmail,
        type: "save",
        actorEmail: actor.email,
        actorName: actor.name,
        targetType,
        targetId: doc._id.toString(),
        targetTitle,
        movieId: doc.movieId || "",
        mediaType: doc.mediaType || "movie",
        read: rngLocal.chance(0.5),
        createdAt: new Date(Math.max(0, actedAt.getTime() + rngLocal.between(1, 900) * 60000)),
      });
    }

    if (rngLocal.chance(0.55)) {
      const commenters = weightedActors(rngLocal, doc.userEmail, users).slice(0, rngLocal.between(1, 3));
      for (const actor of commenters) {
        const comment = {
          _id: newId(),
          parentType: targetType,
          parentId: doc._id.toString(),
          userEmail: actor.email,
          userName: actor.name,
          body: rngLocal.pick(COMMENT_BODIES),
          createdAt: new Date(Math.max(0, actedAt.getTime() + rngLocal.between(1, 2600) * 60000)),
          updatedAt: new Date(Math.max(0, actedAt.getTime() + rngLocal.between(1, 2600) * 60000)),
        };
        comments.push(comment);

        notifications.push({
          userEmail: doc.userEmail,
          type: "comment",
          actorEmail: actor.email,
          actorName: actor.name,
          targetType,
          targetId: doc._id.toString(),
          targetTitle,
          commentId: comment._id.toString(),
          movieId: doc.movieId || "",
          mediaType: doc.mediaType || "movie",
          read: rngLocal.chance(0.35),
          createdAt: comment.createdAt,
        });
      }
    }
  }

  for (const user of users) {
    const followers = weightedActors(
      rng,
      user.email,
      users,
      user.followCount,
      Math.ceil(user.followCount * 0.7)
    );
    user.following = followers.map((follower) => follower.email);

    for (const follower of followers) {
      notifications.push({
        userEmail: user.email,
        type: "follow",
        actorEmail: follower.email,
        actorName: follower.name,
        targetType: "user",
        targetId: user.email,
        targetTitle: user.username,
        movieId: "",
        mediaType: "movie",
        read: rng.chance(0.4),
        createdAt: daysAgo(rng.between(0, 300)),
      });
    }
  }

  // A bell showing 60+ unread reads as a bug rather than as activity. Keep a
  // realistic recent window per user and settle everything older to read.
  const now = Date.now();
  const MAX_PER_USER = 45;
  const RECENT_UNREAD = 14;
  const byUser = new Map();

  for (const notification of notifications) {
    if (notification.createdAt.getTime() > now) notification.createdAt = new Date(now);
    const existing = byUser.get(notification.userEmail);
    if (existing) existing.push(notification);
    else byUser.set(notification.userEmail, [notification]);
  }

  const settled = [];
  for (const list of byUser.values()) {
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    for (const [index, notification] of list.slice(0, MAX_PER_USER).entries()) {
      if (index >= RECENT_UNREAD) notification.read = true;
      settled.push(notification);
    }
  }

  return { notifications: settled, comments };
}

function buildConversation(moviePool, tvPool, rng) {
  const anchor = moviePool[0];
  const recMovies = rng.shuffled(moviePool.filter((m) => affinityScore(m, SCIFI) > 0)).slice(0, 4);
  const recShows = rng.shuffled(tvPool.filter((m) => affinityScore(m, SCIFI) > 0)).slice(0, 3);

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
        content: `I loved ${anchor?.title ?? "a film recently"}, can you recommend something similar?`,
        createdAt: daysAgo(3),
      },
      {
        role: "assistant",
        content: `If you liked ${anchor?.title ?? "that"}, these should be right up your alley:`,
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

function buildUserDocs(users) {
  return users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    password: user.passwordHash,
    image: null,
    username: user.username,
    bio: user.bio,
    provider: "credentials",
    emailVerified: new Date(),
    favorites: user.favorites,
    watchlist: user.watchlist,
    following: user.following,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function assertInvariants({ users, reviews, lists, comments, notifications, pools }) {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const reviewsByEmail = Object.fromEntries(users.map((user) => [user.email, user.reviews]));
  const listsByEmail = Object.fromEntries(users.map((user) => [user.email, user.lists]));

  check(pools.movie.length >= 100, `movie pool too small: ${pools.movie.length}`);
  check(pools.tv.length >= 50, `tv pool too small: ${pools.tv.length}`);

  const [genreMovie, genreTv] = pools.genreCoverage;
  check(genreMovie >= 0.95, `only ${(genreMovie * 100).toFixed(1)}% of movies carry genre_ids`);
  check(genreTv >= 0.95, `only ${(genreTv * 100).toFixed(1)}% of shows carry genre_ids`);

  const seenIds = new Set();
  for (const doc of [...users, ...reviews, ...lists, ...comments]) {
    check(!seenIds.has(doc._id.toString()), `duplicate _id ${doc._id}`);
    seenIds.add(doc._id.toString());
  }

  for (const user of users) {
    const label = user.email;
    const favIds = user.favorites.map((f) => f.movieId);
    const watchIds = user.watchlist.map((w) => w.movieId);

    check(user.favorites.length > 20, `${label} favorites ${user.favorites.length} <= 20`);
    check(user.watchlist.length > 20, `${label} watchlist ${user.watchlist.length} <= 20`);
    check(reviewsByEmail[label].length > 9, `${label} reviews <= 9`);
    check(listsByEmail[label].length > 9, `${label} lists <= 9`);
    check(user.journal.length > 40, `${label} journal ${user.journal.length} <= 40`);

    check(new Set(favIds).size === favIds.length, `${label} has duplicate favorite ids`);
    check(new Set(watchIds).size === watchIds.length, `${label} has duplicate watchlist ids`);
    check(
      watchIds.every((id) => !favIds.includes(id)),
      `${label} has a title in both favorites and watchlist`
    );

    // watchedAt carries a unique index, so the journal must never repeat a title.
    const journalIds = user.journal.map((entry) => entry.movieId);
    check(
      new Set(journalIds).size === journalIds.length,
      `${label} journal repeats a movieId (unique index would reject it)`
    );

    const months = new Set(
      user.journal.map((entry) => {
        const date = entry.watchedAt;
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      })
    );
    check(months.size >= 12, `${label} journal covers ${months.size} months, needs >= 12`);

    const rated = user.favorites.filter((f) => f.personalRating > 0);
    check(rated.length >= 20, `${label} only ${rated.length} rated favorites`);

    // This is what fills the Insights genre breakdown and genre chart, which
    // stayed empty while the old seed produced genreIds: [] on every favorite.
    const withGenres = user.favorites.filter((f) => f.genreIds.length > 0).length;
    check(
      withGenres / user.favorites.length >= 0.9,
      `${label} only ${withGenres}/${user.favorites.length} favorites carry genreIds`
    );
    check(
      user.favorites.every((f) => f.addedAt.getTime() <= Date.now()),
      `${label} has a favorite added in the future`
    );
    check(
      user.watchlist.every((w) => w.addedAt.getTime() <= Date.now()),
      `${label} has a watchlist entry added in the future`
    );

    const myNotifs = notifications.filter((n) => n.userEmail === label);
    check(myNotifs.length >= 10, `${label} has ${myNotifs.length} notifications, needs >= 10`);
    check(
      myNotifs.filter((n) => !n.read).length >= 3,
      `${label} has too few unread notifications`
    );
    check(user.following.length > 0, `${label} follows nobody`);
  }

  const publicReviews = reviews.filter((r) => r.visibility === "public");
  check(publicReviews.length >= 12, `only ${publicReviews.length} public reviews, feed needs >= 12`);
  const publicLists = lists.filter((l) => l.visibility === "public");
  check(publicLists.length >= 8, `only ${publicLists.length} public lists, feed needs >= 8`);

  const orphanComments = comments.filter(
    (comment) =>
      ![...reviews, ...lists].some((parent) => parent._id.toString() === comment.parentId)
  );
  check(orphanComments.length === 0, `${orphanComments.length} comments point at no parent`);

  const badActors = notifications.filter((n) => n.userEmail === n.actorEmail);
  check(badActors.length === 0, `${badActors.length} notifications are self-directed`);

  return failures;
}

let exitCode = 0;
let client;

try {
  console.log(`Fetching TMDB catalog (${DRY_RUN ? "dry run" : "live"})...`);

  const moviePool = await fetchPool({
    mediaType: "movie",
    sources: [
      { path: "/movie/popular", pages: 3 },
      { path: "/movie/top_rated", pages: 3 },
      { path: "/movie/now_playing", pages: 2 },
    ],
    target: 130,
  });
  console.log(`  movies: ${moviePool.length}`);

  const tvPool = await fetchPool({
    mediaType: "tv",
    sources: [
      { path: "/tv/popular", pages: 3 },
      { path: "/tv/top_rated", pages: 2 },
    ],
    target: 80,
  });
  console.log(`  shows:  ${tvPool.length}`);

  if (moviePool.length < 100 || tvPool.length < 50) {
    throw new Error(
      `Not enough titles from TMDB (${moviePool.length} movies, ${tvPool.length} shows). Check TMDB_API_KEY and network access.`
    );
  }

  const pool = [...moviePool, ...tvPool];

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = DEMO_USERS.map((config) => {
    const rng = makeRng(config.seed);
    const favorites = buildFavorites(pool, config, rng);
    const watchlist = buildWatchlist(pool, config, rng, favorites);
    const journal = buildJournal(favorites, pool, config, rng);

    return {
      ...config,
      _id: newId(),
      passwordHash,
      favorites,
      watchlist,
      journal,
      following: [],
      reviews: buildReviews(favorites, config, rng),
      lists: buildLists(favorites, watchlist, config, rng),
    };
  });

  const reviews = users.flatMap((user) => user.reviews);
  const lists = users.flatMap((user) => user.lists);

  const social = buildSocial(users, reviews, lists, makeRng(4242));
  const conversations = [
    {
      _id: newId(),
      userEmail: "demo1@kinorbia.dev",
      ...buildConversation(moviePool, tvPool, makeRng(7)),
    },
  ];

  const userDocs = buildUserDocs(users);

  const genreCoverage = [
    moviePool.filter((m) => m.genreIds.length > 0).length / moviePool.length,
    tvPool.filter((t) => t.genreIds.length > 0).length / tvPool.length,
  ];

  const failures = assertInvariants({
    users,
    reviews,
    lists,
    comments: social.comments,
    notifications: social.notifications,
    pools: { movie: moviePool, tv: tvPool, genreCoverage },
  });

  console.log("\nPlanned documents:");
  for (const user of users) {
    const myNotifs = social.notifications.filter((n) => n.userEmail === user.email);
    const months = new Set(
      user.journal.map((entry) => `${entry.watchedAt.getUTCFullYear()}-${entry.watchedAt.getUTCMonth()}`)
    ).size;
    console.log(
      `  ${user.name.padEnd(16)} fav=${String(user.favorites.length).padStart(2)} ` +
        `watch=${String(user.watchlist.length).padStart(2)} journal=${String(user.journal.length).padStart(2)} ` +
        `(${months}mo) reviews=${String(user.reviews.length).padStart(2)} lists=${String(user.lists.length).padStart(2)} ` +
        `follows=${String(user.following.length).padStart(2)} notifs=${String(myNotifs.length).padStart(3)}`
    );
  }
  console.log(
    `\n  totals -> users:${users.length} journal:${users.reduce((s, u) => s + u.journal.length, 0)} ` +
      `reviews:${reviews.length} movielists:${lists.length} comments:${social.comments.length} ` +
      `notifications:${social.notifications.length} conversations:${conversations.length}`
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} invariant failure(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    throw new Error("Seed data did not satisfy the invariants.");
  }
  console.log("\nAll invariants passed.");

  if (DRY_RUN) {
    console.log("\nDry run: nothing was written and no database connection was opened.");
    console.log("Run `npm run seed:data` (add --yes to skip the prompt) to write this data.");
  } else {
    const target = describeTarget(uri);
    console.log("\nAbout to write to:");
    console.log(`  host:     ${target.host}`);
    console.log(`  database: ${target.database}`);
    console.log("  this replaces only the 10 demo accounts' documents.\n");

    if (!ASSUME_YES) {
      if (!process.stdin.isTTY) {
        throw new Error(
          "Refusing to write without confirmation. Re-run with --yes to confirm non-interactively."
        );
      }
      const rl = await import("node:readline/promises");
      const answer = await rl.default.createInterface({ input: process.stdin, output: process.stdout }).question(
        `Write the demo data to ${target.host}/${target.database}? Type "yes" to continue: `
      );
      if (answer.trim().toLowerCase() !== "yes") {
        throw new Error("Cancelled.");
      }
    }

    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db(target.database);

    const demoEmails = DEMO_USERS.map((config) => config.email);
    for (const name of [
      "journalentries",
      "reviews",
      "movielists",
      "conversations",
      "comments",
      "notifications",
    ]) {
      await db.collection(name).deleteMany({ userEmail: { $in: demoEmails } });
    }
    await db.collection("users").deleteMany({ email: { $in: demoEmails } });

    const journalDocs = users.flatMap((user) =>
      user.journal.map((entry) => ({
        _id: newId(),
        userEmail: user.email,
        userName: user.name,
        ...entry,
        createdAt: entry.watchedAt,
        updatedAt: entry.watchedAt,
      }))
    );

    await db.collection("users").insertMany(userDocs);
    await db.collection("journalentries").insertMany(journalDocs);
    await db.collection("reviews").insertMany(reviews);
    await db.collection("movielists").insertMany(lists);
    await db.collection("conversations").insertMany(conversations);
    if (social.comments.length > 0) await db.collection("comments").insertMany(social.comments);
    if (social.notifications.length > 0) {
      await db.collection("notifications").insertMany(social.notifications);
    }

    const totals = {};
    for (const name of [
      "users",
      "journalentries",
      "reviews",
      "movielists",
      "conversations",
      "comments",
      "notifications",
    ]) {
      totals[name] = await db.collection(name).countDocuments({});
    }

    console.log("\nSeed complete.");
    console.log(
      `Totals -> users:${totals.users} journalentries:${totals.journalentries} ` +
        `reviews:${totals.reviews} movielists:${totals.movielists} conversations:${totals.conversations} ` +
        `comments:${totals.comments} notifications:${totals.notifications}`
    );
    console.log(`\nDemo login (all ${DEMO_USERS.length} accounts): ${DEMO_PASSWORD}`);
    for (const user of DEMO_USERS) {
      console.log(`  ${user.email}  (${user.username})`);
    }
    console.log("\nRe-run anytime to reset the demo data.");
  }
} catch (error) {
  exitCode = 1;
  console.error("\nSeed failed:", error?.message || error);
} finally {
  if (client) await client.close();
}

process.exit(exitCode);
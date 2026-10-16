// A member's data export must CONTAIN everything they own, not merely avoid leaking.
//
// `checkPrivacy.mjs` guards the leak direction. This guards the other one, and it exists
// because nothing guarded it: the export quietly omitted the author's own display name on
// every review and list, the per-row broadcast consent stamp on every watched title, and the
// mediaType on every list entry -- which made an exported list of TV shows indistinguishable
// from a list of movies, since `mediaKey` is `mediaType:movieId` and the TMDB id spaces
// overlap numerically. check:privacy reported "ok" throughout, because it only ever asks
// whether something foreign is present.
//
// Assertions, in order of how badly they hurt:
//   1. required keys present, and no key outside the allowed set, per section and per item
//   2. no secret field anywhere, by name or by shape (bcrypt)
//   3. section lengths equal to the real document counts, so a truncated export cannot pass
//   4. every value is JSON-native: no Date, ObjectId or Mongoose document survives
//   5. every list entry declares a mediaType of movie or tv
//   6. the seeded members are not exporting empty sections
//
// Exported as a pure function so a failing bundle can be proved in-memory, without editing a
// file to test the check. Read-only.

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import dbConnect from "../lib/dbConnect.ts";
import { buildExportBundle } from "../features/profile/queries.ts";
import User from "../models/User.ts";
import UserMovie from "../models/UserMovie.ts";
import Review from "../models/Review.ts";
import MovieList from "../models/MovieList.ts";

const MEMBERS = ["demo1@kinorbia.dev", "demo2@kinorbia.dev", "demo3@kinorbia.dev"];

// Required keys are always present. Allowed keys may or may not be: JSON.stringify drops a key
// whose value is undefined, so an optional field that is unset simply is not in the file. That
// is why this is two sets rather than an exact match -- an exact match would flag every member
// who has not set a bio.
const SHAPES = {
  bundle: {
    required: ["exportedAt", "user", "favorites", "watchlist", "following", "followersCount", "watched", "reviews", "lists"],
  },
  user: {
    required: ["_id", "name", "email", "shareActivity", "shareActivityAsked", "joinedAt"],
    allowed: ["username", "bio", "image", "provider", "emailVerified", "updatedAt"],
  },
  favorite: {
    required: ["movieId", "mediaType", "title", "posterPath", "voteAverage", "releaseDate", "genreIds", "personalRating"],
    allowed: ["addedAt"],
  },
  watchlist: {
    required: ["movieId", "mediaType", "title", "posterPath", "voteAverage", "releaseDate", "genreIds"],
    allowed: ["addedAt", "personalRating"],
  },
  watched: {
    required: ["movieId", "mediaType", "title", "posterPath", "voteAverage", "releaseDate", "genreIds", "personalRating", "broadcast", "watchedAt"],
    allowed: [],
  },
  review: {
    required: ["_id", "userName", "title", "body", "spoiler", "visibility", "likesCount", "savesCount"],
    allowed: ["posterPath", "movieId", "mediaType", "createdAt", "updatedAt"],
  },
  list: {
    required: ["_id", "userName", "title", "visibility", "movies", "likesCount", "savesCount"],
    allowed: ["description", "createdAt", "updatedAt"],
  },
  listEntry: {
    required: ["movieId", "mediaType", "title"],
    allowed: ["posterPath", "voteAverage", "releaseDate"],
  },
};

const SECRET_KEYS = new Set(["password", "verifyToken", "resetToken", "session", "sessions"]);
const BCRYPT = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;
const MEDIA_TYPES = new Set(["movie", "tv"]);

function checkShape(value, shapeName, path, failures) {
  const shape = SHAPES[shapeName];
  if (!shape || typeof value !== "object" || value === null) {
    failures.push(`${path}: expected an object`);
    return;
  }
  const actual = Object.keys(value);
  for (const key of shape.required) {
    if (!actual.includes(key)) failures.push(`${path}.${key}: required field missing from the export`);
  }
  const permitted = new Set([...shape.required, ...(shape.allowed ?? [])]);
  for (const key of actual) {
    if (!permitted.has(key)) failures.push(`${path}.${key}: unexpected field -- add it to the export or to SHAPES`);
  }
}

// Anything that is not a plain JSON type. A Date or ObjectId here means the file was
// serialised from a live document and the route's JSON.stringify is silently reformatting it,
// which is how raw ids reached the feed before check:serialization existed.
function checkJsonNative(value, path, failures) {
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => checkJsonNative(entry, `${path}[${index}]`, failures));
    return;
  }
  if (type === "object") {
    if (value instanceof Date) {
      failures.push(`${path}: a Date reached the export; serialise it to an ISO string`);
      return;
    }
    const ctor = value.constructor?.name;
    if (ctor && ctor !== "Object") {
      failures.push(`${path}: a ${ctor} reached the export; it would not survive JSON intact`);
      return;
    }
    for (const [key, entry] of Object.entries(value)) checkJsonNative(entry, `${path}.${key}`, failures);
    return;
  }
  failures.push(`${path}: a ${type} reached the export`);
}

function checkSecrets(value, path, failures) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (BCRYPT.test(value)) failures.push(`${path}: a bcrypt-shaped string is present`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => checkSecrets(entry, `${path}[${index}]`, failures));
    return;
  }
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (SECRET_KEYS.has(key)) failures.push(`${path}.${key}: a secret field reached the export`);
      checkSecrets(entry, `${path}.${key}`, failures);
    }
  }
}

/**
 * Pure: no I/O, no globals. Returns a list of human-readable failures, empty when the bundle
 * is complete. `expectedCounts` and `requireNonEmpty` are injected so a mutated bundle can be
 * run through this without a database.
 */
export function assertBundle(bundle, { expectedCounts, requireNonEmpty }) {
  const failures = [];

  if (!bundle || typeof bundle !== "object") {
    return ["bundle: buildExportBundle returned nothing"];
  }

  // Loud rather than silent: with no expectedCounts this function still checks shapes, so a
  // caller that forgets them gets a green run that proves far less than it appears to.
  if (!expectedCounts) {
    failures.push("bundle: expectedCounts is required; without it a truncated export cannot be detected");
  }
  if (typeof requireNonEmpty !== "boolean") {
    failures.push("bundle: requireNonEmpty must be passed explicitly");
  }
  checkShape(bundle, "bundle", "bundle", failures);
  checkShape(bundle.user, "user", "bundle.user", failures);
  checkJsonNative(bundle, "bundle", failures);
  checkSecrets(bundle, "bundle", failures);

  const sections = [
    ["favorites", "favorite"],
    ["watchlist", "watchlist"],
    ["watched", "watched"],
    ["reviews", "review"],
    ["lists", "list"],
  ];

  for (const [key, shapeName] of sections) {
    const rows = bundle[key];
    if (!Array.isArray(rows)) {
      failures.push(`bundle.${key}: expected an array`);
      continue;
    }
    rows.forEach((row, index) => checkShape(row, shapeName, `bundle.${key}[${index}]`, failures));

    if (requireNonEmpty && rows.length === 0) {
      failures.push(`bundle.${key}: empty for a seeded member, so a silent query failure would look identical`);
    }
    if (expectedCounts && key in expectedCounts && rows.length !== expectedCounts[key]) {
      failures.push(`bundle.${key}: ${rows.length} rows exported but the database holds ${expectedCounts[key]}`);
    }
  }

  for (const list of bundle.lists ?? []) {
    const entries = Array.isArray(list.movies) ? list.movies : [];
    entries.forEach((entry, index) => {
      checkShape(entry, "listEntry", `bundle.lists[].movies[${index}]`, failures);
      if (!MEDIA_TYPES.has(entry?.mediaType)) {
        failures.push(`bundle.lists[].movies[${index}].mediaType: "${entry?.mediaType}" makes the entry ambiguous between a movie and a show`);
      }
    });
  }

  for (const row of bundle.following ?? []) {
    if (typeof row !== "string" || row.includes("@")) {
      failures.push(`bundle.following: "${row}" is not a username`);
    }
  }

  if (typeof bundle.followersCount !== "number" || !Number.isInteger(bundle.followersCount)) {
    failures.push("bundle.followersCount: expected an integer count");
  }

  return failures;
}

// Stable across a JSON round trip: if this is false the route would change the bytes it serves.
function assertSerialisable(bundle) {
  try {
    const once = JSON.stringify(bundle);
    return typeof once === "string" && JSON.parse(once) !== null
      ? []
      : ["bundle: JSON.stringify did not produce a parseable document"];
  } catch (error) {
    return [`bundle: not serialisable (${error?.message ?? error})`];
  }
}

async function documentCounts(email) {
  const [favorites, watchlist, watched, reviews, lists, followersCount] = await Promise.all([
    UserMovie.countDocuments({ userEmail: email, "favorite.addedAt": { $ne: null } }),
    UserMovie.countDocuments({ userEmail: email, "watchlist.addedAt": { $ne: null } }),
    UserMovie.countDocuments({ userEmail: email, "watched.watchedAt": { $ne: null } }),
    Review.countDocuments({ userEmail: email }),
    MovieList.countDocuments({ userEmail: email }),
    User.countDocuments({ following: email }),
  ]);
  return { favorites, watchlist, watched, reviews, lists, followersCount };
}

// Run only when executed directly. assertBundle is imported by the self-test, and a
// module that self-executes on import would exit the process before that test ran.
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await dbConnect();

  let failed = 0;
  let checked = 0;

  for (const email of MEMBERS) {
    let bundle;
    try {
      bundle = await buildExportBundle(email);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL  ${email}: export threw`);
      console.error(`        ${error?.message ?? error}`);
      continue;
    }

    if (!bundle) {
      failed += 1;
      console.error(`  FAIL  ${email}: buildExportBundle returned null`);
      continue;
    }

    const counts = await documentCounts(email);
    const failures = [
      ...assertBundle(bundle, { expectedCounts: counts, requireNonEmpty: true }),
      ...assertSerialisable(bundle),
    ];

    // followersCount is compared here rather than inside assertBundle so the pure function stays
    // free of a second database read.
    if (bundle.followersCount !== counts.followersCount) {
      failures.push(`bundle.followersCount: ${bundle.followersCount} exported but the database holds ${counts.followersCount}`);
    }

    if (failures.length > 0) {
      failed += 1;
      console.error(`  FAIL  ${email}: ${failures.length} problem(s)`);
      for (const line of failures) console.error(`        ${line}`);
      continue;
    }

    checked += 1;
    const items =
      bundle.favorites.length +
      bundle.watchlist.length +
      bundle.watched.length +
      bundle.reviews.length +
      bundle.lists.length;
    console.log(
      `  ok    ${email}  ${items} items across 5 sections, all fields present, counts match`
    );
}

console.log(`\n${checked}/${checked + failed} export bundles are complete.`);

if (failed > 0) {
  console.error("\nA member's data export is missing data they own.");
  process.exit(1);
}

process.exit(0);
}

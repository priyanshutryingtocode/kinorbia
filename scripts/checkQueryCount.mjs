// Counts the database round trips the app makes for work that does not need them.
//
// The redundancy this guards is invisible from the outside: `listUserMedia` ran a
// `countDocuments` for every call, including the ones that asked for a single row and never
// looked at the total. The result was always correct, so every other gate passed. Only the
// number of queries was wrong.
//
// The count is taken at the collection, which is one call per command actually sent to Mongo --
// mongoose's debug channel reports driver events, not commands, and fires several per query.
//
// The session lookup is memoised per request by React's `cache()`, but only inside a server
// component render. In a plain script there is no request scope, so this measures the
// unmemoised path -- which is the right thing to measure here. The gate is about how many
// queries a piece of work costs, not about React's memoisation.
//
// Read-only. Exits 1 if a query budget is exceeded, so it can run as a gate.

import dbConnect from "../lib/dbConnect.ts";
import { loadSessionUser } from "../lib/sessionUser.ts";
import { getLatestFavoriteOfType, getPersonalMediaStatus } from "../features/media/queries.ts";
import User from "../models/User.ts";
import UserMovie from "../models/UserMovie.ts";

const EMAIL = "demo1@kinorbia.dev";
const MEDIA_ID = "550";
const MEDIA_TYPE = "movie";

// What this sequence is allowed to spend. It was 5 before the split.
const BUDGET = 4;

const UserModel = User.default ?? User;
const UserMovieModel = UserMovie.default ?? UserMovie;

let commands = 0;
for (const model of [UserModel, UserMovieModel]) {
  const collection = model.collection;
  for (const name of ["find", "findOne", "aggregate", "countDocuments", "distinct"]) {
    const original = collection[name]?.bind(collection);
    if (!original) continue;
    collection[name] = (...args) => {
      commands += 1;
      return original(...args);
    };
  }
}

await dbConnect();

const steps = [];
const step = async (name, fn) => {
  const before = commands;
  const started = process.hrtime.bigint();
  await fn();
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  steps.push({ name, commands: commands - before, elapsedMs: Math.round(elapsed) });
};

// The page's own auth() call.
await step("session lookup", () => loadSessionUser(EMAIL));

// The member's status for this title.
await step("media status", () => getPersonalMediaStatus(EMAIL, MEDIA_ID, MEDIA_TYPE));

// One favourite of a type, used by the recommendations strip on /movies and /shows. This asks
// for a single row, and used to pay for a count of the member's whole shelf as well.
await step("latest favourite of type", () => getLatestFavoriteOfType(EMAIL, MEDIA_TYPE));

const total = steps.reduce((sum, entry) => sum + entry.commands, 0);
const elapsed = steps.reduce((sum, entry) => sum + entry.elapsedMs, 0);

console.log(`  ${total} database command(s) in ${elapsed} ms`);
for (const entry of steps) {
  console.log(
    `    ${String(entry.commands).padStart(2)} command(s), ${String(entry.elapsedMs).padStart(4)} ms  ${entry.name}`
  );
}

if (total > BUDGET) {
  console.error(`\n  ${total} queries is over the budget of ${BUDGET}.`);
  process.exit(1);
}

process.exit(0);

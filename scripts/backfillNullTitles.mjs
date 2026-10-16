// Fill `usermovies.title` where it is null or empty.
//
// 68 of 670 rows were seeded before buildLibrary guarded the title, and `title` is
// `required` on the schema -- so those documents render blank and the model would refuse
// them on any write. The id is on every row, so the title can simply be re-fetched.
//
// Safe by default: reports and changes nothing without --yes.
//
//   npm run backfill:null-titles -- --dry     report only
//   npm run backfill:null-titles -- --yes     write

import { MongoClient } from "mongodb";

const YES = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!URI || !TMDB_API_KEY) {
  console.error("MONGODB_URI and TMDB_API_KEY must be set in .env.local");
  process.exit(1);
}

const missing = { title: null };
const empty = { title: "" };
const whitespace = { title: { $regex: /^\s+$/ } };
// A placeholder counts as missing. A seed fallback wrote 67 of these, which passed every
// "is the field present" check and rendered as "Untitled" on the activity feed.
const placeholder = { title: "Untitled" };
const BROKEN = { $or: [missing, empty, whitespace, placeholder] };

async function tmdbTitle(movieId, mediaType) {
  const path = mediaType === "tv" ? `/tv/${encodeURIComponent(movieId)}` : `/movie/${encodeURIComponent(movieId)}`;
  const url = `https://api.themoviedb.org/3${path}?api_key=${TMDB_API_KEY}&language=en-US`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url);
      // 404 is an answer, not a failure: the id is gone from TMDB and no retry helps.
      if (response.status === 404) return { ok: false, reason: "404 (not on TMDB)" };
      if (!response.ok) {
        if (attempt === 3) return { ok: false, reason: `HTTP ${response.status}` };
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      const data = await response.json();
      const title = data.title || data.name || data.original_title || data.original_name;
      return title ? { ok: true, title } : { ok: false, reason: "no title on the payload" };
    } catch (error) {
      if (attempt === 3) return { ok: false, reason: error.cause?.code ?? error.message };
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  return { ok: false, reason: "unreachable" };
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const rows = db.collection("usermovies");
    const total = await rows.countDocuments({});
    const broken = await rows.find(BROKEN).toArray();

    console.log(`Target: ${DB_NAME}`);
    console.log(`Mode:   ${YES ? "WRITE" : "DRY RUN (no changes)"}`);
    console.log("");
    console.log(`Rows total: ${total}`);
    console.log(`Rows needing a title: ${broken.length}`);
    console.log("");

    if (!broken.length) {
      console.log("Every row has a title.");
      return;
    }

    const unfixed = [];
    let fixedCount = 0;

    for (const row of broken) {
      const result = await tmdbTitle(row.movieId, row.mediaType);

      if (!result.ok) {
        unfixed.push({ row, reason: result.reason });
        continue;
      }

      if (YES) {
        await rows.updateOne({ _id: row._id }, { $set: { title: result.title } });
      }
      fixedCount += 1;
    }

    const byMember = new Map();
    for (const row of broken) {
      byMember.set(row.userEmail, (byMember.get(row.userEmail) ?? 0) + 1);
    }

    console.log(`Resolved from TMDB: ${fixedCount}`);
    if (unfixed.length) {
      console.log(`Unresolved:         ${unfixed.length}`);
      for (const { row, reason } of unfixed) {
        console.log(`  ${row.userEmail} / ${row.movieId} / ${row.mediaType} -- ${reason}`);
      }
    }
    console.log("");
    console.log(`By member: ${[...byMember].map(([e, n]) => `${e}=${n}`).join("  ")}`);

    if (YES) {
      // Re-read rather than trust the write counts.
      const remaining = await rows.countDocuments(BROKEN);
      console.log("");
      console.log(
        remaining === 0
          ? "Done: every row now has a title."
          : `${remaining} row(s) still lack a title -- see the unresolved list above.`
      );
    } else {
      console.log("");
      console.log("Dry run: nothing was written.");
      if (unfixed.length) {
        console.log("Those rows need a hand -- they will keep a placeholder until corrected.");
      }
      console.log("Re-run with --yes to apply.");
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
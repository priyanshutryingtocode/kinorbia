// A member's data export must not carry anybody else's identity.
//
// This exists because it did. `socialFields` stores `likedBy` / `savedBy` as EMAIL ADDRESSES,
// and `buildExportBundle` read reviews and lists with no projection at all, so every review a
// member wrote shipped the addresses of everyone who liked or saved it. The function's own
// comment claimed "Secrets are projected out rather than deleted afterwards, so a forgotten
// destructure cannot leak them" -- which was true of the member's own User document and false
// of everything else it read.
//
// Measured on the seeded data before the fix: demo1's export contained 132 other members'
// email addresses. After it: zero.
//
// The check builds a real bundle per seeded member and walks the whole thing looking for any
// string containing an "@" that is not the requester's own address. Read-only.

import dbConnect from "../lib/dbConnect.ts";
import { buildExportBundle } from "../features/profile/queries.ts";

const STRICT = process.argv.includes("--strict");

// Seeded members. Each one has authored content AND been liked/saved by others, which is
// the shape that leaked.
const MEMBERS = ["demo1@kinorbia.dev", "demo2@kinorbia.dev", "demo3@kinorbia.dev"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Walks the bundle the way the route serialises it, recording the path to anything that
// looks like an address. A path is reported, not just a count, so a regression names the
// field that reintroduced it.
function collectAddresses(value, path, found, depth = 0) {
  if (depth > 12 || value == null) return found;
  if (typeof value === "string") {
    if (EMAIL.test(value.trim())) found.push({ path, value: value.trim() });
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectAddresses(entry, `${path}[${index}]`, found, depth + 1));
    return found;
  }
  for (const [key, entry] of Object.entries(value)) {
    collectAddresses(entry, `${path}.${key}`, found, depth + 1);
  }
  return found;
}

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

  checked += 1;
  const found = collectAddresses(bundle, "bundle", []);
  const foreign = found.filter((entry) => entry.value !== email);

  if (foreign.length > 0) {
    failed += 1;
    console.error(`  FAIL  ${email}: export carries ${foreign.length} other member(s) address(es)`);
    const paths = [...new Set(foreign.map((entry) => entry.path.replace(/\[\d+\]/g, "[]")))];
    for (const p of paths) console.error(`        ${p}`);
    continue;
  }

    // `following` is usernames, not addresses, so this check is blind to it by construction. That
    // is a deliberate trade and it is invisible unless reported: a follow list is the member's own
    // relationship data, but the entries are still third-party identities, pseudonymised rather
    // than absent. Print the count so the decision stays reviewable instead of assumed.
    const counts =
      bundle.reviews.length +
      bundle.lists.length +
      bundle.favorites.length +
      bundle.watchlist.length +
      bundle.watched.length;
    console.log(
      `  ok    ${email}  ${counts} items, ${found.length} address (own), 0 foreign, ${bundle.following.length} followed username(s)`
    );
}

console.log(`\n${checked - failed}/${checked} export bundles are free of third-party addresses.`);

if (failed > 0) {
  console.error("\nA data export would disclose another member's email address.");
  process.exit(STRICT ? 1 : 0);
}

process.exit(0);
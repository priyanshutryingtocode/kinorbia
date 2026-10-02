// One recursive source-file walker, shared by both check scripts.
//
// They each had their own, differing in a way that was going to bite: one
// skipped the three ignored directories with an `if` per entry and the other via
// a Set, and one returned a spread while the other threaded an accumulator. A
// fourth directory added to one would silently not be checked by the other.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

export function walkSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkSourceFiles(full));
    else if (/\.(tsx|ts)$/.test(full)) out.push(full);
  }
  return out;
}

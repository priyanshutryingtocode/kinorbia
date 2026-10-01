// Fails on exports nothing outside their own file reads. Run with:
//   node scripts/checkUnusedExports.mjs
//
// The gap this exists to fill: `tsc --noUnusedLocals` and `eslint` both pass
// with an unused export, because an export is by definition "used" as far as
// the compiler is concerned. Ten had accumulated, five of them introduced by
// the refactors that added them -- including `DIALOG_PANEL_CLASS`, exported
// from AccessibleDialog with a comment saying TrailerButton named the same
// default, which it never did.
//
// Skipped deliberately: anything declared in a file with no imports at all
// (standalone scripts), and names short enough to collide by accident.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
// auth.ts and middleware.ts sit at the repo root, not under a directory, and
// auth.ts is the sole consumer of getClientIp and duplicateKeyField. A scan of
// the three directories alone calls both of them unused.
const ROOT_FILES = ["auth.ts", "middleware.ts"].filter((f) => existsSync(f));
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

// One export, one name. Requires `export const Foo` / `export function Foo` at
// the start of a line, so re-exports and `export default` are left alone.
const EXPORT = /^export (?:async )?(?:function|const|let|type|class) (\w+)/gm;

const files = [...ROOTS.flatMap((root) => walk(root)), ...ROOT_FILES];
const source = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

// Count every identifier across the whole tree once, rather than re-scanning
// per export, which is O(files x exports) and does not finish.
const word = /\b\w+\b/g;
const occurrences = new Map();
for (const text of source.values()) {
  for (const match of text.match(word) ?? []) {
    occurrences.set(match, (occurrences.get(match) ?? 0) + 1);
  }
}

function countIn(file, name) {
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return (source.get(file).match(pattern) ?? []).length;
}

const findings = [];

for (const file of files) {
  const text = source.get(file);

  for (const match of text.matchAll(EXPORT)) {
    const name = match[1];
    // Too generic to trust a whole-tree count.
    if (name.length <= 2) continue;
    // Local to the file if every mention is in the file.
    if ((occurrences.get(name) ?? 0) === countIn(file, name)) {
      findings.push({ file, name, local: countIn(file, name) });
    }
  }
}

console.log(`checked ${files.length} files (${ROOTS.join(", ")} + ${ROOT_FILES.length} at the root)`);

if (findings.length > 0) {
  console.error(`\n${findings.length} export(s) nothing else reads:`);
  for (const { file, name, local } of findings) {
    console.error(`  - ${name} (${file}) — only ${local} mention(s) in its own file`);
  }
  console.error("\nEither drop the `export`, or use it. If it is deliberately a");
  console.error("public API, reference it so this check can see that.");
  process.exit(1);
}

console.log("no unused exports");
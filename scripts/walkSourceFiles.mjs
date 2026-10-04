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

import { existsSync, readFileSync } from "node:fs";
import { walkSourceFiles } from "./walkSourceFiles.mjs";

const ROOTS = ["app", "components", "lib"];
const ROOT_FILES = ["auth.ts", "middleware.ts"].filter((f) => existsSync(f));
const EXPORT = /^export (?:async )?(?:function|const|let|type|class) (\w+)/gm;

const files = [...ROOTS.flatMap(walkSourceFiles), ...ROOT_FILES];
const source = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
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
    if (name.length <= 2) continue;
    const local = countIn(file, name);
    if ((occurrences.get(name) ?? 0) === local) {
      findings.push({ file, name, local });
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
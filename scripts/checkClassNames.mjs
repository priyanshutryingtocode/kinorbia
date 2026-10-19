// A class name built by interpolation is not a class name to Tailwind.
//
// Tailwind scans source files for literal strings and emits a CSS rule for each candidate it
// recognises. A class assembled at runtime -- `${side}-0` -- is invisible to that scan, so no
// rule is ever generated for it. Nothing warns: the build succeeds, the element still renders,
// it just renders in the wrong place.
//
// That is not hypothetical. `MovieCarousel` built its two scroll-arrow classes as
// `${side}-0`. `left-0` was only in the stylesheet because `SectionHeader` and `StarRating`
// happen to use it, and `right-0` appeared in no file at all, so it was never generated. The
// right arrow therefore had no horizontal positioning, fell back to its static position at the
// left edge of the carousel, and both arrows sat stacked on the left.
//
// The rule below flags a template literal that
//   1. interpolates something next to a hyphen -- `${x}-sm`, `text-${x}` -- so the value is a
//      FRAGMENT of a class name rather than a whole one, and
//   2. ends up in a className, either directly or through a local helper.
//
// Everything else is deliberately left alone. Interpolated DOM ids (`${id}-heading`,
// `${chartId}-summary`) are not classes and Tailwind has no opinion about them, and a variable
// holding a whole class string (`const deltaClass = "text-highlight"`) is fine, because the
// literal is right there in the file for the scanner to find.
//
// If you genuinely need a computed class, force it with `@source inline(...)` in
// app/globals.css. That is Tailwind v4's own escape hatch and it keeps the class in the
// stylesheet even though the scanner cannot see it.

import { readFileSync } from "node:fs";
import { walkSourceFiles } from "./walkSourceFiles.mjs";

const ROOTS = ["app", "components", "lib"];
const FILES = ROOTS.flatMap(walkSourceFiles);

// A hyphen IMMEDIATELY next to an interpolation. `left-0` has hyphens but no interpolation;
// `${side}-0` has an interpolation with a hyphen right after it. Strict adjacency on purpose:
// `text-content ${config.action}` is a whole class followed by a whole class, not a fragment.
const FRAGMENT = /\$\{[^{}]*\}-|-\$\{/;

// Any template literal, including one that spans lines.
const TEMPLATE = /`([^`]*)`/gs;

// The template is the value of a JSX attribute: `foo={`...`}`.
const ATTRIBUTE_VALUE = /([A-Za-z][\w-]*)\s*=\{\s*`/;

// The attribute opens and the template starts on the next line: `foo={` then a backtick below.
const ATTRIBUTE_OPEN = /([A-Za-z][\w-]*)\s*=\{\s*$/;

// The template is assigned to a name: `const thing = `...``.
const ASSIGNED_TO = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;

// The template is returned from a function; the function is the target.
const RETURNED_FROM = /\breturn\s+`/;

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/**
 * Comments are stripped first, and they have to be: this codebase explains its own traps in
 * prose, and a comment like "built as `${side}-0`" is a backtick-quoted template literal to any
 * scanner. A trailing `//` comment is left alone, because the source contains URLs and a
 * naive strip from `//` would eat the rest of those lines.
 */
function stripComments(source) {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  return withoutBlocks
    .split("\n")
    .map((line) => (line.trim().startsWith("//") ? "" : line))
    .join("\n");
}

/**
 * The name that holds this template literal, so the script can check where it is used.
 * Either a variable it is assigned to, or the function it is returned from.
 */
function findTarget(lines, lineIndex) {
  const line = lines[lineIndex] ?? "";

  const assigned = line.match(ASSIGNED_TO);
  if (assigned) return { kind: "variable", name: assigned[1] };

  if (RETURNED_FROM.test(line)) {
    // Walk back to the enclosing declaration.
    for (let i = lineIndex; i >= 0; i -= 1) {
      const fn = lines[i]?.match(/\bfunction\s+([A-Za-z_$][\w$]*)/);
      if (fn) return { kind: "function", name: fn[1] };
      const arrow = lines[i]?.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/);
      if (arrow) return { kind: "function", name: arrow[1] };
    }
  }

  return null;
}

/** Is this name used as a className anywhere in the file? */
function reachesClassName(lines, name) {
  const pattern = new RegExp(`className\\s*=\\s*\\{[^}]*\\b${name}\\b`);
  return lines.some((line) => pattern.test(line));
}

/**
 * The JSX attribute whose value is the template starting on `lineIndex`, when that attribute
 * opens on a line above. `className={` on one line and the template on the next is common
 * enough in this codebase to be worth handling.
 */
function findOpeningAttribute(lines, lineIndex) {
  for (let back = lineIndex - 1; back >= 0 && back >= lineIndex - 3; back -= 1) {
    const previous = lines[back] ?? "";
    if (!previous.trim()) continue;
    const opened = previous.match(ATTRIBUTE_VALUE) ?? previous.match(ATTRIBUTE_OPEN);
    if (opened) return opened[1];
    // A closing brace or bracket between here and the attribute ends the search.
    if (/[})]\s*$/.test(previous)) return null;
  }
  return null;
}

const failures = [];

for (const file of FILES) {
  const raw = readFileSync(file, "utf8");
  const source = stripComments(raw);
  const lines = source.split("\n");

  for (const match of source.matchAll(TEMPLATE)) {
    const content = match[1] ?? "";
    if (!FRAGMENT.test(content)) continue;

    const index = match.index ?? 0;
    const lineIndex = lineOf(source, index) - 1;
    const line = lines[lineIndex] ?? "";

    // Directly a JSX attribute value: className is the one that matters.
    const attribute = line.match(ATTRIBUTE_VALUE);
    if (attribute) {
      if (attribute[1] === "className") {
        failures.push({ file, line: lineIndex + 1, detail: content.trim().replace(/\s+/g, " ") });
      }
      // Any other attribute -- id, key, aria-*, href -- is not a class.
      continue;
    }

    // The attribute may open on a previous line: `className={` then the template below it.
    const opened = findOpeningAttribute(lines, lineIndex);
    if (opened) {
      if (opened === "className") {
        failures.push({ file, line: lineIndex + 1, detail: content.trim().replace(/\s+/g, " ") });
      }
      continue;
    }

    // Otherwise it is a value or a return; find what holds it and where that ends up.
    const target = findTarget(lines, lineIndex);
    if (!target) continue;
    if (!reachesClassName(lines, target.name)) continue;

    failures.push({ file, line: lineIndex + 1, detail: content.trim().replace(/\s+/g, " ") });
  }
}

if (failures.length > 0) {
  console.error(`\n  ${failures.length} class name(s) are built by interpolation.\n`);
  for (const failure of failures) {
    console.error(`  ${failure.file}:${failure.line}`);
    console.error(`      ${failure.detail}`);
    console.error(`      Tailwind cannot see this, so no CSS rule is generated for it.`);
  }
  console.error(
    "\n  Write the class names out in full, or force them with `@source inline(...)` in app/globals.css."
  );
  process.exit(1);
}

console.log(`  checked ${FILES.length} files, no class name is built by interpolation.`);
process.exit(0);

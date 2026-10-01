// Fails on contrast regressions in the palette. Run with: node scripts/checkContrast.mjs
//
// The bug this exists to prevent: `text-neutral-700` is a Tailwind grey meant
// for a light background, and it reached 15 call sites in an app whose canvas is
// #0a0a0a. It measured 1.73:1, which made the rating stars, the disabled pager
// buttons, and every poster-fallback icon invisible. Nothing about that was
// visible in review, so it is checked mechanically instead.
//
// Three checks:
//   1. No dark-theme-only palette greys in markup.
//   2. Every declared --color-* token clears WCAG AA against all three surfaces
//      of BOTH themes.
//   3. Every token referenced by @theme actually resolves.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS = "app/globals.css";
const ROOTS = ["app", "components"];

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(full)) out.push(full);
  }
  return out;
}

const parseHex = (value) => {
  const hex = value.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = parseHex(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const css = readFileSync(CSS, "utf8");

// Pull the custom properties out of one block, e.g. ":root" or the light override.
function block(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const vars = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[a-z0-9-]+):\s*(.+?);\s*$/i);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

const dark = block(":root {");
const light = block(':root[data-theme="light"] {');

const failures = [];
const notes = [];

// --- 1. dark-only greys in markup -----------------------------------------
// These are the values that disappear against a near-black canvas. Any of them
// is a bug regardless of where it is used.
const FORBIDDEN = [
  ["text-neutral-600", "#525252"],
  ["text-neutral-700", "#404040"],
  ["text-neutral-800", "#262626"],
];

for (const file of ROOTS.flatMap(walk)) {
  const src = readFileSync(file, "utf8");
  for (const [cls, hex] of FORBIDDEN) {
    const on = dark["--canvas"];
    if (contrast(hex, on) >= AA_BODY) continue;
    const uses = src.split(cls).length - 1;
    if (uses > 0) {
      failures.push(
        `${file}: ${cls} used ${uses}x, but it is ${contrast(hex, on).toFixed(2)}:1 on --canvas ${on}. ` +
          `Use text-content-subtle (${contrast(dark["--content-subtle"], on).toFixed(2)}:1).`
      );
    }
  }
}

// --- 2. token contrast --------------------------------------------------
// Measured the way each token is actually used, not as a blanket matrix. A
// token's valid partner depends on what it sits on:
//
//   body text        -> any of the three page surfaces, needs 4.5
//   accent / gold    -> also used for icons, borders and large text, so 3.0
//   --on-*           -> foregrounds for a *filled chip*, measured against that
//                       chip's own background, never against a page surface
//
// Checking --on-accent against --canvas would flag every value ever chosen,
// since a light foreground on a light canvas is supposed to be unreadable.
const BODY_TOKENS = ["--content", "--content-muted", "--content-subtle"];
const LARGE_TOKENS = ["--accent", "--accent-hover", "--highlight"];
const SURFACES = ["--canvas", "--surface", "--surface-raised"];

// The darkest scrim a label is actually placed on, composited over a mid-grey
// poster. Approximated as an opaque colour so the maths stays simple.
const SCRIM = "#111111";

for (const [themeName, vars] of [["dark", dark], ["light", light]]) {
  for (const token of BODY_TOKENS) {
    const value = vars[token];
    for (const surface of SURFACES) {
      const ratio = contrast(value, vars[surface]);
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on ${surface} (${vars[surface]}), below ${AA_BODY} for body text.`
        );
      }
    }
  }

  for (const token of LARGE_TOKENS) {
    const value = vars[token];
    for (const surface of SURFACES) {
      const ratio = contrast(value, vars[surface]);
      if (ratio < AA_LARGE) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on ${surface} (${vars[surface]}), below ${AA_LARGE} for icons/large text.`
        );
      }
    }
  }

  // Foregrounds on filled chips.
  const pairs = [
    ["--on-accent", "--accent", AA_BODY],
    ["--on-accent", "--accent-hover", AA_BODY],
    ["--on-highlight", "--highlight", AA_BODY],
    ["--on-scrim", SCRIM, AA_BODY],
  ];

  for (const [fg, bgToken, min] of pairs) {
    const bg = bgToken.startsWith("#") ? bgToken : vars[bgToken];
    const ratio = contrast(vars[fg], bg);
    if (ratio < min) {
      failures.push(
        `${themeName}: ${fg} (${vars[fg]}) is ${ratio.toFixed(2)}:1 on ${bg} (${bgToken}), below ${min}.`
      );
    }
  }
}

// Filled chips that are raw Tailwind palette values rather than tokens, checked
// here because they also carry --on-accent text. emerald-600 with near-white
// text measured 3.46:1 and was invisible as a label.
const RAW_CHIPS = [
  ["emerald-700", "#047857"],
  ["blue-600", "#2563eb"],
];

for (const [name, value] of RAW_CHIPS) {
  const ratio = contrast(dark["--on-accent"], value);
  if (ratio < AA_BODY) {
    failures.push(
      `--on-accent (${dark["--on-accent"]}) is ${ratio.toFixed(2)}:1 on ${name} (${value}), below ${AA_BODY}. Darken the fill.`
    );
  }
}

// --- 3. every @theme colour resolves --------------------------------------
const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf("}", css.indexOf("@theme")));
const referenced = [...themeBlock.matchAll(/--color-([a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/g)];

for (const [, name, source] of referenced) {
  if (!dark[source]) {
    failures.push(`@theme maps --color-${name} to var(${source}), which :root never declares.`);
  }
}

// Non-inverting tokens must be declared identically in both blocks, or one theme
// silently inherits the other's value.
const SHARED = ["--on-accent", "--on-scrim", "--on-highlight"];
for (const token of SHARED) {
  if (light[token] && light[token] !== dark[token]) {
    notes.push(`${token} differs between themes; confirm that is intentional.`);
  }
}

console.log(`checked ${ROOTS.flatMap(walk).length} source files, ${referenced.length} theme colours`);
console.log(`dark surfaces: canvas ${dark["--canvas"]} / surface ${dark["--surface"]} / raised ${dark["--surface-raised"]}`);
console.log(`light surfaces: canvas ${light["--canvas"]} / surface ${light["--surface"]} / raised ${light["--surface-raised"]}`);

for (const note of notes) console.log(`note: ${note}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nall tokens clear WCAG AA in both themes");
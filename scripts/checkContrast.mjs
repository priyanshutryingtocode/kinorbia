// Fails on contrast regressions and off-token colours. Run with: node scripts/checkContrast.mjs
//
// The bug this exists to prevent: `text-neutral-700` is a Tailwind grey meant
// for a light background, and it reached 15 call sites in an app whose canvas is
// #0a0a0a. It measured 1.73:1, which made the rating stars, the disabled pager
// buttons, and every poster-fallback icon invisible. Nothing about that was
// visible in review, so it is checked mechanically instead.
//
// Checks:
//   1. No raw Tailwind palette colour classes in markup. The default palette is
//      deleted in globals.css (`--color-*: initial`), so these would generate no
//      CSS -- caught here because a class that silently does nothing is worse
//      than one that is obviously wrong.
//   2. No hex/rgb colour literals in markup, and none in globals.css outside the
//      two token blocks. A literal cannot follow data-theme, which is how the
//      watch-activity chart shipped dark-theme point fills that rendered as black
//      discs in the light theme.
//   3. Every declared --color-* token clears WCAG AA against all three surfaces
//      of BOTH themes.
//   4. Every token referenced by @theme actually resolves.

import { readFileSync, existsSync } from "node:fs";
import { walkSourceFiles } from "./walkSourceFiles.mjs";

const CSS = "app/globals.css";
const ROOTS = ["app", "components", "lib"];

// Walked once. The three checks below that scan source used to each call
// `ROOTS.flatMap(walk)` independently -- two full tree walks to run checks that
// read the same files, and a third just to print a count.
const FILES = ROOTS.flatMap(walkSourceFiles);

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

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

// What a colour actually paints at when an opacity modifier is applied over an
// opaque backdrop. Tailwind's `/80` compiles to `color-mix(in oklab, C 80%,
// transparent)`, which resolves to this on screen -- so contrast measured
// against the bare token is measuring a colour the user never sees.
//
// Note this composites in sRGB rather than oklab, which is what color-mix does
// for a single percentage stop against `transparent` once the backdrop is known.
// It is an approximation of the browser's blend, chosen because the alternative
// is not measuring it at all.
const composite = (fg, bg, alpha) => {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
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

// Model CSS inheritance. `block()` reads each theme in isolation, so a token the
// light block does not override is absent from `light` rather than equal to its
// :root value. Without this every inherited token resolves to undefined, and
// `contrast(undefined, x)` is NaN -- and `NaN < 4.5` is false, so an inherited
// token would pass every check in this file silently.
const resolve = (vars, token) => {
  const value = vars[token] ?? dark[token];
  if (value === undefined) throw new Error(`token declared in neither theme: ${token}`);
  return value;
};

const failures = [];
const notes = [];

// --- 1. off-token colour classes ------------------------------------------
// This replaces a list of three dark-only greys. The app carried 57 raw palette
// classes across 26 files, four different reds used interchangeably for both
// the brand accent and hard errors, and no mechanical check at all.
//
// The separator matters and getting it wrong is how six classes survived the
// palette deletion below unnoticed. Numeric hues are always written `red-300`,
// but `black` and `white` have no numeric steps in Tailwind and are therefore
// always written with an opacity modifier -- `bg-black/70`, `ring-white/5` -- or
// with an arbitrary one, `bg-white/[0.02]`. A pattern ending in `-\d+` matches
// `bg-black-500`, which occurs nowhere in this codebase, and misses every form
// that actually occurs.
const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const OFF_TOKEN_CLASS = new RegExp(
  String.raw`\b(?:text|bg|border|ring|fill|stroke|divide|outline|decoration|placeholder|caret|accent|from|via|to)-(${HUES}|black|white)(?:-|/)(?:\d{1,3}|\[[^\]]*\])(?![-\w])`,
  "g"
);

// Line comments are stripped first: several files carry comments naming the
// palette class they used to have, and those are history, not markup.
const stripLineComments = (src) => src.replace(/\/\/.*$/gm, "");

// A guard on the guard. This regex was originally written to require a numeric
// step, which matched `bg-black-500` -- a class that occurs nowhere here -- and
// silently missed all six real occurrences, all of which use an opacity
// modifier. Six classes then stopped rendering when the palette was deleted and
// this check reported the codebase clean. Every form the app actually uses is
// asserted below, alongside the token classes it must not touch, because a
// pattern that quietly stops matching looks exactly like a clean bill of health.
{
  const MUST_CATCH = [
    // The three forms that got through. Numeric hues are `red-300`; black and
    // white have no steps, so they only ever appear with a modifier.
    "bg-black/70", "ring-white/5", "bg-white/[0.02]",
    "group-hover/card:bg-black/8", "hover:bg-black/70", "sm:bg-white/40",
    "bg-black-500", "text-red-300", "text-red-100", "border-blue-500",
    "from-amber-400/90", "bg-emerald-700",
  ];
  const MUST_NOT_CATCH = [
    // Every token class, and the keyword utilities Tailwind injects directly
    // into each colour utility rather than reading from the theme.
    "bg-scrim/70", "bg-scrim/0", "text-accent-text", "bg-glass", "bg-surface-raised",
    "text-content-subtle", "border-rule-strong", "divide-rule", "via-rule",
    "fill-current", "bg-transparent", "border-transparent", "from-transparent",
    // Non-colour classes that must not be mistaken for hues.
    "text-[10px]", "sm:top-2", "max-w-64", "w-full", "p-2/3", "bg-white/70px",
  ];

  for (const cls of MUST_CATCH) {
    OFF_TOKEN_CLASS.lastIndex = 0;
    if (!OFF_TOKEN_CLASS.test(cls)) {
      failures.push(`checkContrast self-test: OFF_TOKEN_CLASS no longer matches \`${cls}\`, so it is not doing its job.`);
    }
  }
  for (const cls of MUST_NOT_CATCH) {
    OFF_TOKEN_CLASS.lastIndex = 0;
    if (OFF_TOKEN_CLASS.test(cls)) {
      failures.push(`checkContrast self-test: OFF_TOKEN_CLASS now matches \`${cls}\`, which is a token or keyword class.`);
    }
  }
}

// --- 2. colour literals in markup -----------------------------------------
// SVG presentation attributes accept var(), so a literal is always a bypass.
const LITERAL = /(?:#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/;
const COLOR_ATTR = /\b(?:stroke|fill|stopColor|stop-color|color|backgroundColor|borderColor|shadowColor)\s*=\s*["'`]([^"'`]+)["'`]/g;
const ARBITRARY_COLOR = /(?:bg|text|border|ring|shadow|from|via|to|fill|stroke|decoration)-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()[^\]]*\]/g;
// Non-greedy to the closing braces: the body routinely contains template
// interpolations like `${fillPercent}%`, whose own `}` would end a `[^}]*` match
// one token early and hide whatever followed it.
const INLINE_STYLE = /style=\{\{([\s\S]*?)\}\}/g;

// Checks 1 and 2 share one walk and one read per file. They used to be two
// separate `for (const file of ROOTS.flatMap(walk))` loops, which meant walking
// all three roots twice and reading and comment-stripping every file twice --
// and a third walk just to print the file count in the summary line.
for (const file of FILES) {
  const src = stripLineComments(readFileSync(file, "utf8"));

  // --- 1: raw Tailwind palette classes
  for (const match of src.matchAll(OFF_TOKEN_CLASS)) {
    const [cls, hue] = match;
    const hint = hue === "red"
      ? "Use text-accent-text for the brand, text-danger for errors."
      : hue === "black" || hue === "white"
        ? "Use a --scrim token over artwork, or text-content / bg-surface on a page surface."
        : "Use a --color-* token from globals.css.";
    failures.push(`${file}: \`${cls}\` is a raw Tailwind palette class. ${hint}`);
  }

  // --- 2: colour literals in markup

  for (const [, value] of src.matchAll(COLOR_ATTR)) {
    // `none`, `currentColor`, `transparent` and `url(#gradient)` are not colours.
    if (/^(none|currentcolor|transparent|url\()/i.test(value)) continue;
    if (!LITERAL.test(value)) continue;
    failures.push(
      `${file}: \`${value}\` is a colour literal in a presentation attribute. Use var(--color-*) so it follows data-theme.`
    );
  }

  for (const [cls] of src.matchAll(ARBITRARY_COLOR)) {
    failures.push(
      `${file}: \`${cls}\` hardcodes a colour. Declare an elevation or tint token in globals.css instead.`
    );
  }

  // The last way in. A dynamic width or height is fine; a colour is not.
  for (const [, body] of src.matchAll(INLINE_STYLE)) {
    if (!LITERAL.test(body)) continue;
    failures.push(
      `${file}: inline style hardcodes a colour -- \`${body.trim()}\`. Use a --color-* token in a class instead.`
    );
  }
}

// --- 2b. colour literals in globals.css outside the token blocks -----------
// The palette lives in :root. A literal anywhere else cannot change with the
// theme: ::selection used rgba(220, 38, 38, 0.35), which is the *dark* accent,
// so selection stayed fire-engine red over the light canvas.
{
  // Blanking rather than deleting, and preserving every newline, so the line
  // numbers in the failure messages still address the real file. Comments and
  // url() payloads are blanked for the same reason.
  const blank = (match) => match.replace(/[^\n]/g, " ");
  const blankBlockAfter = (src, selector) => {
    const open = src.indexOf(selector);
    if (open === -1) return src;
    const close = src.indexOf("}", open);
    return src.slice(0, open) + blank(src.slice(open, close + 1)) + src.slice(close + 1);
  };

  const outsideThemes = blankBlockAfter(css, ":root {")
    .replace(/:root\[data-theme="light"\] \{/, (m) => m)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/url\([^)]*\)/g, blank);

  // Now blank the light-theme block itself, found in the already-blanked text.
  const lightOpen = outsideThemes.indexOf(':root[data-theme="light"] {');
  const lightClose = lightOpen === -1 ? -1 : outsideThemes.indexOf("}", lightOpen);
  const scannable =
    lightOpen === -1
      ? outsideThemes
      : outsideThemes.slice(0, lightOpen) +
        blank(outsideThemes.slice(lightOpen, lightClose + 1)) +
        outsideThemes.slice(lightClose + 1);

  scannable.split("\n").forEach((line, i) => {
    if (!LITERAL.test(line)) return;
    failures.push(
      `app/globals.css:${i + 1}: colour literal outside :root -- \`${line.trim()}\`. ` +
        `Use var(--token) or color-mix so it follows the theme.`
    );
  });
}

// --- 3. token contrast --------------------------------------------------
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
const BODY_TOKENS = ["--content", "--content-muted", "--content-subtle", "--danger", "--accent-text", "--info", "--wordmark"];
// --highlight was here, held only to 3.0 as if it were only ever used on icons
// and large text. It is not: 12 `kin-overline` kickers render it at 10px and
// WCAG counts that as body text, needing 4.5. At 3.0 the light palette could
// pass a gold that was illegible at the size it is actually used at.
const LARGE_TOKENS = ["--accent", "--accent-hover", "--success"];
const SURFACES = ["--canvas", "--surface", "--surface-raised"];

// The gold family is checked at both strengths: --highlight at full, and
// --highlight-muted at /80, which is how every kicker renders it. An opacity
// modifier composites rather than resolving to a token, so until
// --highlight-muted existed this was invisible here -- the light palette was
// "passing" a kicker that measured 3.32:1 on the page. These two are measured
// through `composite`, which is the whole point: the check now sees what the
// browser actually paints.
const GOLD_FULL = "--highlight";
const GOLD_MUTED = "--highlight-muted";
// Full strength, and it used to be 0.8. The kickers render at 10px in
// `text-highlight-muted` with no opacity modifier; the /80 was removed from the
// markup because compositing any hue at 80% costs about a fifth of its contrast
// and left every candidate too close to neutral to read as a colour. Compositing
// here at /80 would measure a rendering the app no longer produces, and would
// fail bronze at 3.93:1 while the painted kicker is 5.26:1.
const GOLD_MUTED_ALPHA = 1.0;

// The darkest scrim a label is actually placed on, composited over a mid-grey
// poster. Approximated as an opaque colour so the maths stays simple.
const SCRIM = "#111111";

for (const [themeName, vars] of [["dark", dark], ["light", light]]) {
  for (const token of BODY_TOKENS) {
    const value = resolve(vars, token);
    for (const surface of SURFACES) {
      const ratio = contrast(value, resolve(vars, surface));
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on ${surface} (${resolve(vars, surface)}), below ${AA_BODY} for body text.`
        );
      }
    }
  }

  // The gold, at both of the strengths it is actually painted at. Held to the
  // body threshold because a 10px kicker is body text, not large text.
  {
    const full = resolve(vars, GOLD_FULL);
    for (const surface of SURFACES) {
      const ratio = contrast(full, resolve(vars, surface));
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${GOLD_FULL} (${full}) is ${ratio.toFixed(2)}:1 on ${surface} (${resolve(vars, surface)}), below ${AA_BODY}. ` +
            `It is used at 10px by the kin-overline kickers, so it is body text.`
        );
      }
    }

    // Measured the way the browser paints it: /80 over each surface.
    const muted = resolve(vars, GOLD_MUTED);
    for (const surface of SURFACES) {
      const painted = composite(muted, resolve(vars, surface), GOLD_MUTED_ALPHA);
      const ratio = contrast(painted, resolve(vars, surface));
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${GOLD_MUTED} (${muted}) at /${GOLD_MUTED_ALPHA * 100} composites to ${painted} on ${surface} ` +
            `(${resolve(vars, surface)}) at ${ratio.toFixed(2)}:1, below ${AA_BODY}. Darken it: on a light ground a subtler ` +
            `colour has to be deeper, and the reverse holds on a dark one.`
        );
      }
    }
  }

  for (const token of LARGE_TOKENS) {
    const value = resolve(vars, token);
    for (const surface of SURFACES) {
      const ratio = contrast(value, resolve(vars, surface));
      if (ratio < AA_LARGE) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on ${surface} (${resolve(vars, surface)}), below ${AA_LARGE} for icons/large text.`
        );
      }
    }
  }

  // The band ramp, checked per theme. `.kin-ink-band` paints the header and
  // footer, and light mode's band is a graphite rather than the near-black dark
  // mode uses, so one ramp cannot serve both -- the tokens are resolved through
  // `resolve`, which lets the light block override only the ones that differ.
  //
  // Red is why this cannot stay shared. No red clears body-text AA on any
  // mid-grey: #ef4444 measures 5.12:1 on dark's #120d0d but only 3.80:1 on
  // light's #2a2a2e, which is what forces light's --accent-bright to #f87171
  // rather than sharing the darker one.
  const inkPairs = [
    ["--ink-content", "--ink", AA_BODY],
    ["--ink-muted", "--ink", AA_BODY],
    ["--ink-subtle", "--ink", AA_BODY],
    ["--ink-content", "--ink-raised", AA_BODY],
    ["--ink-muted", "--ink-raised", AA_BODY],
    ["--ink-subtle", "--ink-raised", AA_BODY],
    ["--highlight-vivid", "--ink", AA_BODY],
    ["--highlight-vivid", "--ink-raised", AA_BODY],
    ["--accent-bright", "--ink", AA_BODY],
    ["--accent-bright", "--ink-raised", AA_BODY],
  ];

  for (const [fg, bgToken, min] of inkPairs) {
    const ratio = contrast(resolve(vars, fg), resolve(vars, bgToken));
    if (ratio < min) {
      failures.push(
        `${themeName} band: ${fg} (${resolve(vars, fg)}) is ${ratio.toFixed(2)}:1 on ` +
          `${bgToken} (${resolve(vars, bgToken)}), below ${min}.`
      );
    }
  }

  // Foregrounds on filled chips.
  const pairs = [
    ["--on-accent", "--accent", AA_BODY],
    ["--on-accent", "--accent-hover", AA_BODY],
    ["--on-highlight", "--highlight", AA_BODY],
    ["--on-scrim", SCRIM, AA_BODY],
    // The filled green and blue chips behind the Watched and Watchlist toggles.
    // These needed their own tokens because --success and --info are tuned as
    // icon colours: --success at #22c55e carries near-white at 2.28:1, which is
    // why emerald-700 and blue-600 used to be hardcoded in those two buttons.
    ["--on-accent", "--success-solid", AA_BODY],
    ["--on-accent", "--info-solid", AA_BODY],
  ];

  for (const [fg, bgToken, min] of pairs) {
    const bg = bgToken.startsWith("#") ? bgToken : resolve(vars, bgToken);
    const ratio = contrast(resolve(vars, fg), bg);
    if (ratio < min) {
      failures.push(
        `${themeName}: ${fg} (${resolve(vars, fg)}) is ${ratio.toFixed(2)}:1 on ${bg} (${bgToken}), below ${min}.`
      );
    }
  }
}

// --- 4. every @theme colour resolves --------------------------------------
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

console.log(`checked ${FILES.length} source files, ${referenced.length} theme colours`);
console.log(`dark surfaces: canvas ${dark["--canvas"]} / surface ${dark["--surface"]} / raised ${dark["--surface-raised"]}`);
console.log(`light surfaces: canvas ${light["--canvas"]} / surface ${light["--surface"]} / raised ${light["--surface-raised"]}`);

for (const note of notes) console.log(`note: ${note}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nall tokens clear WCAG AA in both themes");
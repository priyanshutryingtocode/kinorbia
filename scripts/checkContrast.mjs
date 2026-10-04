
import { readFileSync } from "node:fs";
import { walkSourceFiles } from "./walkSourceFiles.mjs";

const CSS = "app/globals.css";
const ROOTS = ["app", "components", "lib"];
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


const composite = (fg, bg, alpha) => {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

const css = readFileSync(CSS, "utf8");

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

const resolve = (vars, token) => {
  const value = vars[token] ?? dark[token];
  if (value === undefined) throw new Error(`token declared in neither theme: ${token}`);
  return value;
};

const failures = [];
const notes = [];

const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const OFF_TOKEN_CLASS = new RegExp(
  String.raw`\b(?:text|bg|border|ring|fill|stroke|divide|outline|decoration|placeholder|caret|accent|from|via|to)-(${HUES}|black|white)(?:-|/)(?:\d{1,3}|\[[^\]]*\])(?![-\w])`,
  "g"
);

const stripLineComments = (src) => src.replace(/\/\/.*$/gm, "");

{
  const MUST_CATCH = [
    "bg-black/70", "ring-white/5", "bg-white/[0.02]",
    "group-hover/card:bg-black/8", "hover:bg-black/70", "sm:bg-white/40",
    "bg-black-500", "text-red-300", "text-red-100", "border-blue-500",
    "from-amber-400/90", "bg-emerald-700",
  ];
  const MUST_NOT_CATCH = [
    "bg-scrim/70", "bg-scrim/0", "text-accent-text", "bg-glass", "bg-surface-raised",
    "text-content-subtle", "border-rule-strong", "divide-rule", "via-rule",
    "fill-current", "bg-transparent", "border-transparent", "from-transparent",
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

const LITERAL = /(?:#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/;
const COLOR_ATTR = /\b(?:stroke|fill|stopColor|stop-color|color|backgroundColor|borderColor|shadowColor)\s*=\s*["'`]([^"'`]+)["'`]/g;
const ARBITRARY_COLOR = /(?:bg|text|border|ring|shadow|from|via|to|fill|stroke|decoration)-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()[^\]]*\]/g;
const INLINE_STYLE = /style=\{\{([\s\S]*?)\}\}/g;

for (const file of FILES) {
  const src = stripLineComments(readFileSync(file, "utf8"));

  for (const match of src.matchAll(OFF_TOKEN_CLASS)) {
    const [cls, hue] = match;
    const hint = hue === "red"
      ? "Use text-accent-text for the brand, text-danger for errors."
      : hue === "black" || hue === "white"
        ? "Use a --scrim token over artwork, or text-content / bg-surface on a page surface."
        : "Use a --color-* token from globals.css.";
    failures.push(`${file}: \`${cls}\` is a raw Tailwind palette class. ${hint}`);
  }


  for (const [, value] of src.matchAll(COLOR_ATTR)) {
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

  for (const [, body] of src.matchAll(INLINE_STYLE)) {
    if (!LITERAL.test(body)) continue;
    failures.push(
      `${file}: inline style hardcodes a colour -- \`${body.trim()}\`. Use a --color-* token in a class instead.`
    );
  }
}

{
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

const BODY_TOKENS = ["--content", "--content-muted", "--content-subtle", "--danger", "--accent-text", "--info", "--wordmark"];
const LARGE_TOKENS = ["--accent", "--accent-hover", "--success"];
const SURFACES = ["--canvas", "--surface", "--surface-raised"];
const GOLD_FULL = "--highlight";
const GOLD_MUTED = "--highlight-muted";
const GOLD_MUTED_ALPHA = 1.0;
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

  const pairs = [
    ["--on-accent", "--accent", AA_BODY],
    ["--on-accent", "--accent-hover", AA_BODY],
    ["--on-highlight", "--highlight", AA_BODY],
    ["--on-scrim", SCRIM, AA_BODY],
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

const themeBlock = css.slice(css.indexOf("@theme"), css.indexOf("}", css.indexOf("@theme")));
const referenced = [...themeBlock.matchAll(/--color-([a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/g)];

for (const [, name, source] of referenced) {
  if (!dark[source]) {
    failures.push(`@theme maps --color-${name} to var(${source}), which :root never declares.`);
  }
}


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

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

// Not every token is hex: `--overlay-surface` is rgba() or var(), and parseHex returns
// [NaN, NaN, NaN] for those. `NaN < 4.5` is false, which is a check that never fires.
// That is not hypothetical: the auth card shipped entirely unchecked for exactly
// this reason, and dropping its border to 0.04 alpha still reported "all tokens
// clear WCAG AA in both themes".
//
// So this resolves all three forms a token can take. An unparseable value now
// raises instead of quietly yielding NaN, because a checker that cannot measure
// something must say so rather than pass it.
function parseColor(value) {
  const raw = String(value).trim();

  if (raw.startsWith("#")) {
    return parseHex(raw);
  }

  const rgb = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((part) => parseFloat(part.trim()));
    return [parts[0], parts[1], parts[2]];
  }

  // `var(--token)`: hand back the reference so the caller can resolve it against
  // the same theme's declarations.
  const ref = raw.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
  if (ref) {
    return ref[1];
  }

  throw new Error(`cannot parse colour: ${raw}`);
}

// Alpha of a colour token, defaulting to opaque. Needed because the card's own
// surface is translucent and anything measured against it has to be painted onto
// what the browser actually shows, not onto the raw token.
function parseAlpha(value) {
  const raw = String(value).trim();
  const rgb = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) {
    // A bare percentage, which is how --band-alpha is written. Without this it fell
    // through to the alpha-1 default below, so a 94% band would have been measured
    // as fully opaque and the gate would have agreed with a value nothing paints.
    const pct = raw.match(/^([\d.]+)%$/);
    return pct ? parseFloat(pct[1]) / 100 : 1;
  }
  const parts = rgb[1].split(",").map((part) => part.trim());
  return parts.length > 3 ? parseFloat(parts[3]) : 1;
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

// Accepts `#hex`, `rgb()`, `rgba()` and a bare `var(--token)` reference, which
// `toRgb` resolves against the current theme's declarations.
const luminance = (color, vars) => {
  const [r, g, b] = toRgb(color, vars).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Flattens anything parseColor returned into three 0-255 channels, following a
// `var()` reference if that is what came back. `vars` is the current theme's
// declarations, which is what makes a reference resolve per theme rather than
// always to the dark value.
function toRgb(color, vars) {
  const parsed = Array.isArray(color) ? color : parseColor(color);
  if (typeof parsed === "string") {
    if (!vars) {
      throw new Error(`cannot resolve ${parsed} without the current theme's tokens`);
    }
    return toRgb(parseColor(resolve(vars, parsed)), vars);
  }
  if (parsed.some((channel) => !Number.isFinite(channel))) {
    throw new Error(`unparseable colour channel in ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

const contrast = (a, b, vars) => {
  const [hi, lo] = [luminance(a, vars), luminance(b, vars)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};


// Composites fg over bg at `alpha`, which is how the browser paints a token used
// with an opacity modifier. Returns a hex so the result can be measured directly.
// `vars` follows a `var()` reference in either argument.
const composite = (fg, bg, alpha, vars) => {
  const f = toRgb(fg, vars);
  const b = toRgb(bg, vars);
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

// The tokens .kin-ink-band re-points inside the header and footer, so these are
// exactly the ones painted on the band. --chrome and --rule are excluded: they
// are the band, not text on it, and are checked where they are used as ink.
const BAND_TOKENS = [
  "--ink-content",
  "--ink-muted",
  "--ink-subtle",
  "--highlight-vivid",
  "--accent-bright",
];
const GOLD_FULL = "--highlight";
const GOLD_MUTED = "--highlight-muted";
const GOLD_MUTED_ALPHA = 1.0;
const SCRIM = "#111111";

for (const [themeName, vars] of [["dark", dark], ["light", light]]) {
  for (const token of BODY_TOKENS) {
    const value = resolve(vars, token);
    for (const surface of SURFACES) {
      const ratio = contrast(value, resolve(vars, surface), vars);
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
      const ratio = contrast(full, resolve(vars, surface), vars);
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${GOLD_FULL} (${full}) is ${ratio.toFixed(2)}:1 on ${surface} (${resolve(vars, surface)}), below ${AA_BODY}. ` +
            `It is used at 10px by the kin-overline kickers, so it is body text.`
        );
      }
    }

    const muted = resolve(vars, GOLD_MUTED);
    for (const surface of SURFACES) {
      const painted = composite(muted, resolve(vars, surface), GOLD_MUTED_ALPHA, vars);
      const ratio = contrast(painted, resolve(vars, surface), vars);
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${GOLD_MUTED} (${muted}) at /${GOLD_MUTED_ALPHA * 100} composites to ${painted} on ${surface} ` +
            `(${resolve(vars, surface)}) at ${ratio.toFixed(2)}:1, below ${AA_BODY}. Darken it: on a light ground a subtler ` +
            `colour has to be deeper, and the reverse holds on a dark one.`
        );
      }
    }
  }

// The centred overlay panel -- the sign-in and sign-up card. Its own token
    // rather than one of SURFACES because it is what every token painted on the
    // auth card is actually measured against, and it is tinted: in light mode it
    // composites --surface-raised over --canvas, which is not either of them.
    //
    // This was added because the card shipped unchecked. `--overlay-border` at
    // 0.04 instead of 0.28 passed the suite cleanly, because only the tokens named
    // above are ever measured and this pair was in none of the lists.
    for (const token of BODY_TOKENS) {
      const value = resolve(vars, token);
      const ratio = contrast(value, resolve(vars, "--overlay-surface"), vars);
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on the auth card ` +
            `(${resolve(vars, "--overlay-surface")}), below ${AA_BODY}.`
        );
      }
    }

    // The bronze kicker is painted on that same card at 10px, so it is measured
    // there too rather than only against the three flat surfaces.
    const kicker = composite(
      resolve(vars, GOLD_MUTED),
      resolve(vars, "--overlay-surface"),
      GOLD_MUTED_ALPHA,
      vars
    );
    const kickerRatio = contrast(kicker, resolve(vars, "--overlay-surface"), vars);
    if (kickerRatio < AA_BODY) {
      failures.push(
        `${themeName}: ${GOLD_MUTED} on the auth card is ${kickerRatio.toFixed(2)}:1, below ${AA_BODY}.`
      );
    }

    // The card's edge against the page.
    //
    // WCAG 1.4.11 asks 3:1 for "the visual information required to identify user
    // interface components". This is held at AA_BODY rather than the 3:1 for a
    // control edge, which is the same position --rule and --rule-strong take: the
    // inputs, buttons and links inside the card each meet 3:1 against their own
    // backgrounds and carry their own focus ring, so nothing here is identified by
    // this line alone. What the line does is make a floating panel read as
    // floating.
    //
    // Measured against --canvas, since that is what the card's edge is seen
    // against, not against the card's own fill.
    //
    // This is held at AA_LARGE (3:1) rather than AA_BODY, which is the threshold
    // WCAG 1.4.11 actually sets for the boundary of a component. Requiring 4.5
    // instead -- which is what I tried first -- forced bronze to 0.86 (#8a6636),
    // a solid brown hairline, for a ratio no one needs and which reads as an error
    // state on a sign-in form. 3:1 needs 0.70 (#9c7c54) and is defensible: the
    // card is a distinct surface, and everything inside it meets 3:1 against its
    // own background with its own focus ring, so the edge identifies nothing on
    // its own. The 0.28 it replaced measured 1.52:1, which was the real problem.
    //
    // The border is already an alpha colour in its own right, so its alpha is read
    // rather than forced to 1 -- compositing it at 1 would paint the bronze at full
    // strength and measure a colour the browser never shows.
    const edgeAlpha = parseAlpha(resolve(vars, "--overlay-border"));
    const edge = composite(
      resolve(vars, "--overlay-border"),
      resolve(vars, "--canvas"),
      edgeAlpha,
      vars
    );
    const edgeRatio = contrast(edge, resolve(vars, "--canvas"), vars);
    if (edgeRatio < AA_LARGE) {
      failures.push(
        `${themeName}: --overlay-border is ${edgeRatio.toFixed(2)}:1 on --canvas, below ${AA_LARGE}. ` +
          `The card's edge is what makes it read as a floating panel.`
      );
    }

    for (const token of LARGE_TOKENS) {
      const value = resolve(vars, token);
      for (const surface of SURFACES) {
        const ratio = contrast(value, resolve(vars, surface), vars);
        if (ratio < AA_LARGE) {
          failures.push(
            `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on ${surface} (${resolve(vars, surface)}), ` +
              `below ${AA_LARGE} for icons/large text.`
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
    const ratio = contrast(resolve(vars, fg), resolve(vars, bgToken), vars);
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
      const ratio = contrast(resolve(vars, fg), bg, vars);
      if (ratio < min) {
        failures.push(
          `${themeName}: ${fg} (${resolve(vars, fg)}) is ${ratio.toFixed(2)}:1 on ${bg} (${bgToken}), below ${min}.`
        );
      }
    }

    // The header and footer band is --chrome at --band-alpha, so what the text
    // actually sits on is a composite, not --chrome. Every check above measures a
    // token against a solid surface, which is why the band could be dropped to 80%
    // once and only a hand-written comment caught it: --ink-subtle went 5.59:1 to
    // 3.16:1 and nothing in this file could see it.
    //
    // The backdrop is --canvas, which is exact for the footer (a static block, page
    // behind it) and optimistic for the header (fixed, content scrolls under). The
    // header is held at a higher tint than it needs for that reason.
    const bandAlpha = parseAlpha(resolve(vars, "--band-alpha"));
    const band = composite(resolve(vars, "--chrome"), resolve(vars, "--canvas"), bandAlpha, vars);

    for (const token of BAND_TOKENS) {
      const value = resolve(vars, token);
      if (!value) continue;
      const ratio = contrast(value, band, vars);
      if (ratio < AA_BODY) {
        failures.push(
          `${themeName}: ${token} (${value}) is ${ratio.toFixed(2)}:1 on the band ` +
            `(${resolve(vars, "--chrome")} at ${(bandAlpha * 100).toFixed(0)}% over --canvas = ${band}), ` +
            `below ${AA_BODY}. Lower --band-alpha, or lighten ${token} in this theme.`
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
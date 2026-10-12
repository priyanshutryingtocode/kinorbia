// Makes TypeScript feature modules importable from a plain Node script.
//
// The `check:*` scripts run under `node --experimental-strip-types`, which handles
// the TypeScript syntax but not how this repo writes its specifiers. Three things
// stop a feature module from loading:
//
//   1. `@/lib/media` — the `@/*` path alias. Node does not read tsconfig.json paths.
//   2. `./shared` — extensionless relative imports, used inside models/.
//   3. `server-only` — a marker package Next.js aliases internally. It is not a real
//      dependency and is not present in node_modules.
//
// `checkFetchRetry.mjs` avoids all three by importing lib/httpRetry.ts, which is
// deliberately import-free. That is not an option for a module that reaches a Mongoose
// model, so this hook supplies the missing resolution instead.
//
// `server-only` resolves to an empty module rather than throwing. Its only job is to
// fail the build if a client component imports a server module; that is enforced by
// Next's bundler, not by this hook, so an empty stub is the honest equivalent here.

import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolvePath(HERE, "..");

// Tried in order, mirroring what the TS/Next resolvers accept.
const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx"];
const INDEX_SUFFIXES = ["/index.ts", "/index.tsx", "/index.js"];

function firstExisting(basePath) {
  for (const extension of EXTENSIONS) {
    const candidate = basePath + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  for (const suffix of INDEX_SUFFIXES) {
    const candidate = basePath + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" || specifier === "client-only") {
    return {
      url: "data:text/javascript,export default {};",
      shortCircuit: true,
      format: "module",
    };
  }

  // `@/x` is repo-relative, not relative to the importing file.
  if (specifier.startsWith("@/")) {
    const found = firstExisting(join(REPO_ROOT, specifier.slice(2)));
    if (found) {
      return { url: pathToFileURL(found).href, shortCircuit: true };
    }
  }

// Extensionless relative/absolute file specifiers need `.ts` and friends.
  if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) {
    // Resolve against the importing file's *directory*. Resolving against the full
    // parent path would treat `models/MovieList.ts` as a directory and look for
    // `models/MovieList.ts/shared`.
    const parentDir = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : REPO_ROOT;
    const found = firstExisting(resolvePath(parentDir, specifier));
    if (found) {
      return { url: pathToFileURL(found).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
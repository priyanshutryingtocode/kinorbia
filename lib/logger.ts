import "server-only";

// Structured logging.
//
// JSON lines in production, readable lines in development. A Vercel function's stdout is
// drained by whatever the host provides, so this is vendor-neutral: no SDK, no account, no
// key in .env.local. Swapping in a reporter later means changing `sink` and nothing else.
//
// Everything is redacted on the way out. An email in a log line is a privacy leak the moment
// the log leaves your process -- it lands in a vendor's index, survives a retention window,
// and shows up in a support ticket you pasted into a chat. Redaction here means a caller
// cannot get that wrong by forgetting.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Below warn in production: a successful request should not cost a log line, because the
// volume is what makes people stop reading logs.
const MIN_LEVEL: Level = process.env.NODE_ENV === "production" ? "warn" : "debug";

// Keys whose values are replaced with "[redacted]" at any depth. Deliberately a list of
// names rather than a pattern: a pattern either misses a field or mangles one.
const SECRET_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "verifytoken",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
]);

// Email is not a secret, but it identifies a person, so it is collapsed to its domain.
// Enough to tell "a kinorbia.dev member" from "someone else"; not enough to identify them.
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

// Secret values hiding inside a longer string, which the key list cannot catch because there
// is no key. lib/tmdb.ts logs the full request URL when it gives up, and that URL carries
// `api_key=` -- so this is not hypothetical, it is the reason the pattern exists.
const SECRET_IN_STRING =
  /([?&](?:api[_-]?key|key|token|secret|password|access_token)=)([^&\s"']+)/gi;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[deep]";
  if (typeof value === "string") {
    return value
      .replace(EMAIL, "[redacted-email]@$1")
      .replace(SECRET_IN_STRING, "$1[redacted]");
  }
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    // name and message only. The stack is useful, but it is long and the message usually
    // carries the cause; the stack goes to the host's own error reporting if it wants it.
    return { name: value.name, message: redact(value.message, depth + 1) };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(entry, depth + 1);
  }
  return out;
}

// Where lines go. The only function that touches stdout.
function sink(level: Level, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    // One JSON object per line: a log drain can parse it, `jq` works, and it survives
    // interleaving from concurrent requests in a way a pretty object does not.
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  // Development: the level and message as columns and the context after, so a line is
  // readable in a terminal without piping through jq. The context is built by hand rather
  // than by destructuring the rest -- that needs discard variables, which lint rejects.
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "level" && key !== "message" && key !== "time") extra[key] = value;
  }

  const stamp = String(payload.time).slice(11, 19);
  const tail = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : "";
  process.stdout.write(`${stamp} ${level.padEnd(5)} ${String(payload.message)}${tail}\n`);
}

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  sink(level, {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  });
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};

  // No AppError here yet. The existing routes answer with NextResponse.json directly, so an
  // error class that only the new endpoints used would be a second convention rather than a
  // shared one. Worth adding when there are enough callers to want it, not before.

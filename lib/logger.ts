import "server-only";
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = process.env.NODE_ENV === "production" ? "warn" : "debug";
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

const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

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
    return { name: value.name, message: redact(value.message, depth + 1) };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(entry, depth + 1);
  }
  return out;
}

function sink(level: Level, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

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

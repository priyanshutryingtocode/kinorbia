import mongoose, { type ConnectOptions } from "mongoose";

const mongoUri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Please define MONGODB_URI or MONGO_MONGODB_URI inside .env.local.");
}

export function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export function duplicateKeyField(error: unknown): string | undefined {
  if (!isDuplicateKeyError(error)) {
    return undefined;
  }

  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  if (!keyPattern || typeof keyPattern !== "object") {
    return undefined;
  }

  return Object.keys(keyPattern)[0];
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Only nameserver/network failures: retrying an auth error or a bad URI just
// delays a clear message.
const TRANSIENT_CODES = new Set([
  "ESERVFAIL",
  "EREFUSED",
  "ENOTFOUND",
  "ETIMEOUT",
  "ECONNREFUSED",
]);

const CONNECT_ATTEMPTS = 3;
const CONNECT_BACKOFF_MS = [250, 500];

// SRV lookups for the Atlas host fail intermittently; matching on the message as well
// as `code` covers mongoose wrapping the driver error and dropping the code.
function isTransientConnectError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code) : "";

  if (TRANSIENT_CODES.has(code) || error.message.includes("querySrv")) {
    return true;
  }

  // Mongoose wraps a failed SRV lookup in a ServerSelectionError with no `code` and a message
  // mentioning a timeout, not DNS. Treating that wrapper as fatal meant one flaky resolver
  // took down the request, so it is classified as transient.
  return error.name === "MongooseServerSelectionError";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorCode(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    return String((error as { code?: unknown }).code);
  }

  return "unknown";
}

async function connectWithRetry(opts: ConnectOptions) {
  let lastError: unknown;

  for (let attempt = 0; attempt < CONNECT_ATTEMPTS; attempt += 1) {
    try {
      return await mongoose.connect(mongoUri!, opts);
    } catch (error) {
      if (!isTransientConnectError(error) || attempt === CONNECT_ATTEMPTS - 1) {
        throw error;
      }

      lastError = error;

      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `MongoDB connect attempt ${attempt + 1}/${CONNECT_ATTEMPTS} failed (${errorCode(error)}); retrying.`
        );
      }

      await sleep(CONNECT_BACKOFF_MS[attempt]);
    }
  }

  throw lastError;
}

async function dbConnect() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    // The retry lives inside the cached promise: concurrent callers share one connect
    // attempt sequence rather than each amplifying a flapping resolver.
    cached!.promise = connectWithRetry(opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;

    if (isTransientConnectError(e)) {
      throw new Error(
        "Could not resolve the MongoDB Atlas host. Check that your MongoDB URI is current, the Atlas cluster still exists, and your network/DNS can resolve mongodb+srv records."
      );
    }

    throw e;
  }

  return cached!.conn;
}

export default dbConnect;

import mongoose from "mongoose";

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

// Which index a duplicate-key error actually violated, e.g. "username".
//
// `isDuplicateKeyError` answers "did something collide?", which is enough when
// every collision means the same retry. It is not enough where two different
// fields are unique: a username collision is fixed by trying the next candidate,
// while an email collision is not retryable at all, because the address is the
// same on every attempt. Retrying the latter forever is what the auth Google
// path used to do.
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

async function dbConnect() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    // The module-level guard above throws before this runs, so the
    // non-null assertion holds for the same reason `cached!` does.
    cached!.promise = mongoose.connect(mongoUri!, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;

    if (e instanceof Error && ("code" in e || e.message.includes("querySrv"))) {
      const code = "code" in e ? String(e.code) : "";
      if (code === "ENOTFOUND" || code === "ETIMEOUT" || e.message.includes("querySrv")) {
        throw new Error(
          "Could not resolve the MongoDB Atlas host. Check that your MongoDB URI is current, the Atlas cluster still exists, and your network/DNS can resolve mongodb+srv records."
        );
      }
    }

    throw e;
  }

  return cached!.conn;
}

export default dbConnect;

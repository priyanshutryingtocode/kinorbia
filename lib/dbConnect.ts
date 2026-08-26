import mongoose from "mongoose";

const mongoUri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Please define MONGODB_URI or MONGO_MONGODB_URI inside .env.local.");
}

const MONGODB_URI = mongoUri;

export function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
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

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
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

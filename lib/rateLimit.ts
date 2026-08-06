import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const SWEEP_THRESHOLD = 5000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  identifier: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): boolean {
  const now = Date.now();
  const current = buckets.get(identifier);

  if (!current || current.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (buckets.size >= SWEEP_THRESHOLD) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  current.count += 1;
  return current.count <= limit;
}

type LimitOptions = {
  limit: number;
  windowMs: number;
};

export function withRateLimit(
  handler: (req: Request, args: { ip: string }) => Promise<Response>,
  options: LimitOptions
) {
  return async function rateLimited(req: Request) {
    const ip = getClientIp(req);

    if (!rateLimit(`${req.method}:${new URL(req.url).pathname}:${ip}`, options)) {
      return tooManyRequests(options.windowMs);
    }

    return handler(req, { ip });
  };
}

export function tooManyRequests(windowMs: number) {
  return NextResponse.json(
    { message: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
    }
  );
}
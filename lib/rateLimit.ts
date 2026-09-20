import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

type LimitOptions = {
  limit: number;
  windowMs: number;
};

const limiters = new Map<string, Ratelimit>();

function getRatelimit({ limit, windowMs }: LimitOptions): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
      prefix: "kinorbia:ratelimit",
    });
    limiters.set(key, rl);
  }
  return rl;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }

  return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "unknown";
}

export async function rateLimit(
  identifier: string,
  { limit, windowMs }: LimitOptions
): Promise<boolean> {
  const rl = getRatelimit({ limit, windowMs });
  const { success } = await rl.limit(identifier);
  return success;
}

export function withRateLimit(
  handler: (req: Request, args: { ip: string }) => Promise<Response>,
  options: LimitOptions
) {
  return async function rateLimited(req: Request) {
    const ip = getClientIp(req);

    if (!(await rateLimit(`${req.method}:${new URL(req.url).pathname}:${ip}`, options))) {
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

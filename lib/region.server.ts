import "server-only";

import { headers } from "next/headers";
import { DEFAULT_REGION, isRegionCode } from "@/lib/region";

// The request-reading half of region resolution. See lib/region.ts for the pure helpers and
// for why the country is part of the answer rather than a detail.

// Precedence: ?region=, then Vercel's geo header, then the default.
//
// Accept-Language is deliberately NOT consulted. It reads like a location signal and is not
// one: it is the browser's UI language, and Windows ships "English (United States)" on
// machines all over the world. Someone in Delhi on a US-English browser was shown what
// streams in America -- the exact failure this module exists to prevent. Geo-IP is the closer
// proxy for "what can I watch here", and Vercel provides it.
//
// Nothing falls back OUT of a resolved region: no offers there means the page says so rather
// than substituting another country's catalogue.
export async function resolveWatchRegion(requested?: string): Promise<string> {
  const override = requested?.trim();
  if (isRegionCode(override)) {
    return override.toUpperCase();
  }

  // next/headers is async in this Next version, and is why these pages render per request
  // rather than statically.
  const headerList = await headers();

  const geo = headerList.get("x-vercel-ip-country")?.trim();
  if (isRegionCode(geo)) {
    return geo.toUpperCase();
  }

  return DEFAULT_REGION;
}

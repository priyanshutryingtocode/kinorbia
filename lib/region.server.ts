import "server-only";

import { headers } from "next/headers";
import { DEFAULT_REGION, isRegionCode } from "@/lib/region";

export async function resolveWatchRegion(requested?: string): Promise<string> {
  const override = requested?.trim();
  if (isRegionCode(override)) {
    return override.toUpperCase();
  }

  const headerList = await headers();

  const geo = headerList.get("x-vercel-ip-country")?.trim();
  if (isRegionCode(geo)) {
    return geo.toUpperCase();
  }

  return DEFAULT_REGION;
}

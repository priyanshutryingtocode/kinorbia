
export const DEFAULT_REGION = "IN";

export function isRegionCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value.trim());
}

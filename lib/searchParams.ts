export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseYear(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^\d{4}$/.test(raw)) {
    return undefined;
  }
  const year = Number(raw);
  return year >= 1900 && year <= 2200 ? year : undefined;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

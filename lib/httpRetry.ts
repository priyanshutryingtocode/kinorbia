type RetryInit = RequestInit & {
  next?: { revalidate?: number | false };
};

type FetchOutcome<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number | null };

type RetryExhausted = {
  url: string;
  attempts: number;
  status: number | null;
  cause: unknown;
};

type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
  retryStatuses?: ReadonlySet<number>;
  backoffMs?: number;
  onExhausted?: (info: RetryExhausted) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJsonWithRetry<T>(
  url: string,
  init: RetryInit,
  options: RetryOptions = {}
): Promise<FetchOutcome<T>> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 8000;
  const backoffMs = options.backoffMs ?? 350;
  const retryStatuses = options.retryStatuses;

  let lastStatus: number | null = null;
  let lastCause: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });

      if (!res.ok) {
        lastStatus = res.status;
        lastCause = null;

        if (!retryStatuses?.has(res.status)) {
          return { ok: false, status: res.status };
        }

        await res.body?.cancel().catch(() => {});
      } else {
        return { ok: true, data: (await res.json()) as T, status: res.status };
      }
    } catch (error) {
      lastStatus = null;
      lastCause = error;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await sleep(backoffMs * (attempt + 1));
    }
  }

  options.onExhausted?.({
    url,
    attempts: retries + 1,
    status: lastStatus,
    cause: lastCause,
  });

  return { ok: false, status: lastStatus };
}
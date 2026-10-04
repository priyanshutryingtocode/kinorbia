// One fetch, one timeout budget, one retry policy -- returning a result rather
// than throwing.
//
// This existed twice in `lib/tmdb.ts` with different rules: `tmdbFetch` retried
// and `fetchDetailsWithStatus` did not. Two copies of a network policy is how the
// second one ends up being the one without a timeout.
//
// It is deliberately the dullest possible shape -- a loop, a timer, a status
// check -- because the failure mode being fixed is not subtle logic but a
// transport that occasionally resets. `ECONNRESET` on `read` is undici handing
// back a pooled keep-alive socket the server had already closed. The old policy
// only retried on a status code, so a stale socket was treated as terminal
// immediately; the next attempt opens a fresh connection and usually succeeds,
// which makes retrying the thrown case the actual fix rather than an extra.
//
// Two constraints keep this module importable by `scripts/checkFetchRetry.mjs`,
// which runs it directly through Node's type stripping:
//
//   1. No imports. `next` is redeclared below instead of pulled from a type.
//   2. Type annotations only -- no `enum`, `namespace`, or parameter properties,
//      which erase cleanly. Runtime TypeScript syntax does not.
//
// Both are easy to break by accident, so the check script re-verifies them.

// Next's fetch-cache hint, which is not on the DOM's RequestInit.
type RetryInit = RequestInit & {
  next?: { revalidate?: number | false };
};

type FetchOutcome<T> =
  | { ok: true; data: T; status: number }
  // `status: null` means the request never produced a response at all -- a
  // transport failure or a timeout, as opposed to an HTTP error.
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
  // Statuses worth another attempt. Anything absent is terminal on the first
  // response, which is how a 404 stays a 404 instead of costing three round
  // trips to be reported as a failure. Omitting the set entirely therefore
  // means "retry nothing", which is the safe default.
  retryStatuses?: ReadonlySet<number>;
  // Delay before attempt N+1. Linear rather than exponential because there are
  // at most three attempts and the common case is a dead socket, not a
  // rate-limited API. Exposed mainly so the check does not have to sleep.
  backoffMs?: number;
  // Called once, only when the last attempt fails. This is the hook that turns
  // a silent degradation into a visible one; a caller that renders "no results"
  // has no other way to say why.
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

        // Discard the error body before retrying. An unread body holds the
        // connection, which is the opposite of what the next attempt needs.
        await res.body?.cancel().catch(() => {});
      } else {
        return { ok: true, data: (await res.json()) as T, status: res.status };
      }
    } catch (error) {
      lastStatus = null;
      lastCause = error;
    } finally {
      // Reached on the throwing path too, unlike the version this replaces,
      // which only cleared its timer when the fetch resolved. Every rejected
      // attempt -- transport error, or the abort above -- would otherwise leave
      // a timer armed to fire against an already-settled request.
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
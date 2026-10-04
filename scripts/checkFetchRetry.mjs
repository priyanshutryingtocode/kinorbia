import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const URL_UNDER_TEST = "https://api.test.invalid/thing";


const source = readFileSync(new URL("../lib/httpRetry.ts", import.meta.url), "utf8");

for (const banned of [/^\s*import\s+\{/m, /^\s*import\s+\w/m, /\benum\s/, /\bnamespace\s/]) {
  assert.ok(
    !banned.test(source),
    `lib/httpRetry.ts must stay import-free and annotation-only; found ${banned}`
  );
}

const { fetchJsonWithRetry } = await import("../lib/httpRetry.ts");

// --- stubs -------------------------------------------------------------------

function stubFetch(implementation) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  return () => {
    globalThis.fetch = original;
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    body: null,
  };
}

function connectionReset() {
  const error = new TypeError("fetch failed");
  error.cause = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
  return error;
}

function countTimers() {
  return process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length;
}

// --- cases -------------------------------------------------------------------

const cases = [];
function test(name, run) {
  cases.push({ name, run });
}

test("retries a thrown transport error and succeeds", async () => {
  let calls = 0;
  const restore = stubFetch(async () => {
    calls += 1;
    if (calls < 3) throw connectionReset();
    return jsonResponse(200, { title: "Inception" });
  });

  try {
    const outcome = await fetchJsonWithRetry(URL_UNDER_TEST, {}, {
      retryStatuses: RETRYABLE,
      backoffMs: 0,
    });

    assert.equal(calls, 3, "should have taken three attempts");
    assert.equal(outcome.ok, true, "should have succeeded on the third attempt");
    assert.deepEqual(outcome.data, { title: "Inception" });
  } finally {
    restore();
  }
});

test("a 404 is terminal on the first attempt", async () => {
  let calls = 0;
  const restore = stubFetch(async () => {
    calls += 1;
    return jsonResponse(404, { status_message: "not found" });
  });

  try {
    const outcome = await fetchJsonWithRetry(URL_UNDER_TEST, {}, {
      retryStatuses: RETRYABLE,
      backoffMs: 0,
    });

    assert.equal(calls, 1, "404 must not be retried");
    assert.equal(outcome.ok, false);
    assert.equal(outcome.status, 404, "the 404 has to survive as a 404, not become null");
  } finally {
    restore();
  }
});

test("a persistent 503 stops at retries + 1 and reports exhaustion once", async () => {
  let calls = 0;
  let exhaustions = 0;
  let reported = null;

  const restore = stubFetch(async () => {
    calls += 1;
    return jsonResponse(503, { status_message: "service unavailable" });
  });

  try {
    const outcome = await fetchJsonWithRetry(
      URL_UNDER_TEST,
      {},
      {
        retries: 2,
        retryStatuses: RETRYABLE,
        backoffMs: 0,
        onExhausted: (info) => {
          exhaustions += 1;
          reported = info;
        },
      }
    );

    assert.equal(calls, 3, "two retries means three attempts, not more");
    assert.equal(outcome.ok, false);
    assert.equal(outcome.status, 503);
    assert.equal(exhaustions, 1, "onExhausted must fire exactly once");
    assert.equal(reported.attempts, 3);
    assert.equal(reported.status, 503);
  } finally {
    restore();
  }
});

test("a transport failure reports status null, not a made-up code", async () => {
  let reported = null;
  const restore = stubFetch(async () => {
    throw connectionReset();
  });

  try {
    const outcome = await fetchJsonWithRetry(
      URL_UNDER_TEST,
      {},
      {
        retries: 0,
        retryStatuses: RETRYABLE,
        backoffMs: 0,
        onExhausted: (info) => {
          reported = info;
        },
      }
    );

    assert.equal(outcome.status, null, "no response means no status");
    assert.ok(reported.cause, "the underlying cause has to survive for the log line");
  } finally {
    restore();
  }
});

test("a hung request aborts at the timeout", async () => {
  const restore = stubFetch(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      })
  );

  const HUNG = Symbol("hung");
  const started = Date.now();

  try {
    const outcome = await Promise.race([
      fetchJsonWithRetry(URL_UNDER_TEST, {}, { retries: 0, timeoutMs: 40, backoffMs: 0 }),
      new Promise((resolve) => setTimeout(() => resolve(HUNG), 3000)),
    ]);

    assert.notEqual(outcome, HUNG, "the request never aborted, so the timeout is missing");
    assert.equal(outcome.ok, false);

    const elapsed = Date.now() - started;
    assert.ok(elapsed < 2000, `should abort near 40ms, took ${elapsed}ms`);
  } finally {
    restore();
  }
});

test("repeated calls do not accumulate timers", async () => {
  const restore = stubFetch(async () => {
    throw connectionReset();
  });

  try {
    await fetchJsonWithRetry(URL_UNDER_TEST, {}, { retries: 2, backoffMs: 0 });
    const baseline = countTimers();

    for (let i = 0; i < 5; i += 1) {
      await fetchJsonWithRetry(URL_UNDER_TEST, {}, { retries: 2, backoffMs: 0 });
    }

    assert.equal(
      countTimers(),
      baseline,
      "five more calls each leaking three timers would show up here"
    );
  } finally {
    restore();
  }
});

test("a success never reports exhaustion", async () => {
  let exhaustions = 0;
  const restore = stubFetch(async () => jsonResponse(200, { ok: true }));

  try {
    await fetchJsonWithRetry(URL_UNDER_TEST, {}, {
      retryStatuses: RETRYABLE,
      backoffMs: 0,
      onExhausted: () => {
        exhaustions += 1;
      },
    });
    assert.equal(exhaustions, 0);
  } finally {
    restore();
  }
});

test("omitting retryStatuses retries nothing", async () => {
  let calls = 0;
  const restore = stubFetch(async () => {
    calls += 1;
    return jsonResponse(503, {});
  });

  try {
    await fetchJsonWithRetry(URL_UNDER_TEST, {}, { backoffMs: 0 });
    assert.equal(calls, 1, "no retryStatuses should mean no retries, not every status");
  } finally {
    restore();
  }
});

// --- run ---------------------------------------------------------------------

let failed = 0;

for (const { name, run } of cases) {
  try {
    await run();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error?.message?.split("\n").join("\n        ")}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} retry invariants hold.`);

if (failed > 0) {
  console.error("\nThe retry policy is not what the app depends on. Fix lib/httpRetry.ts.");
  process.exit(1);
}
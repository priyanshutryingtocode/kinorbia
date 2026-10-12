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

// --- the outage-must-not-look-like-an-empty-result invariant -----------------------
//
// A search page that renders "No movies found" when TMDB is unreachable is worse than
// one that renders nothing: it tells a member looking up a film that exists that it
// does not. Three places have to hold, and none can be exercised without a live key.

test("a TMDB outage is reported as failed, never as an empty result", () => {
  const tmdb = readFileSync(new URL("../lib/tmdb.ts", import.meta.url), "utf8");
  const search = readFileSync(new URL("../lib/search.ts", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/actions.ts", import.meta.url), "utf8");
  const searchPage = readFileSync(new URL("../app/(root)/search/page.tsx", import.meta.url), "utf8");

  // The tv normalizer used to default a null response to { results: [] }, which is the
  // conflation in its original form: movie and tv failed differently for one outage.
  // Asserted on behaviour rather than syntax: every route by which a null response
  // becomes an empty list is what matters, and one of them was refactored away
  // mid-change while this gate was green.
  assert.match(tmdb, /data === null/, "the tv normalizer must check the response for null");
  assert.match(tmdb, /\? null\b|return null;/, "and return null rather than defaulting to []");
  // The conflation's fingerprint is the optional chain ON `data` itself -- reaching through a
  // possibly-null response to a field. A `|| []` inside a branch that has already checked
  // `data === null` is a legitimate default for a successful response carrying no results.
  assert.doesNotMatch(
    tmdb,
    /data\?\.results\?\.map/,
    "must never optional-chain through a possibly-null response; check for null first"
  );
  assert.doesNotMatch(
    tmdb,
    /data\?\.results\s*\|\|\s*\[\]/,
    "nor via the optional-chain default, which is the same conflation"
  );

  // lib/search.ts must branch on the response being null, not on results being empty.
  // The loader walks several TMDB pages per logical page, so the outage signal is narrower
  // than it once was: null on the FIRST page is an outage the member should be told about,
  // null on a later one just means the source ran out mid-fill and the titles already
  // collected stand. Both halves are asserted so neither can be dropped.
  assert.match(
    search,
    /if \(response === null\) \{[\s\S]{0,160}?failed = offset === 0;/,
    "fetchSearchResults must set failed when the first page is null"
  );
  assert.match(
    search,
    /if \(response === null\) \{[\s\S]{0,160}?hasMore = false;/,
    "and must stop offering more when a page comes back null"
  );
  assert.match(search, /failed: boolean/, "SearchPage must carry the flag");
  assert.doesNotMatch(
    search,
    /\?\?\.results \|\| \[\]/,
    "the `?.results || []` pattern is what erased the failure; it must be gone"
  );

  assert.match(actions, /if \(batch === null\) \{\s*failed = true;/, "loadBrowsePage must report a null page as failed");

  // And the page must render that as an outage, ahead of the "no results" branch.
  const outageIndex = searchPage.indexOf("data.failed");
  // The branch order matters and the three strings have to be found unambiguously: the
  // outage branch's copy mentions "movies found" in a comment, so matching on the word
  // alone resolves to the wrong line.
  const emptyIndex = searchPage.indexOf('} found`');
  assert.ok(outageIndex > -1, "the search page must branch on data.failed");
  assert.ok(emptyIndex > -1, "the search page must still have a genuine empty state");
  assert.ok(
    outageIndex < emptyIndex,
    "the outage branch must come BEFORE the no-results branch, or the outage never renders"
  );
  assert.match(searchPage, /Couldn't load/, "the outage branch needs its own copy");
  assert.match(searchPage, /<RetryButton \/>/, "and a retry affordance");

  // Posterless titles. TMDB's long tail has no artwork, and every grid reserves an
  // aspect-2/3 poster box regardless, so an unfiltered result is a grid of grey
  // placeholders with N/A badges -- which is what searching Avengers actually produced.
  assert.match(tmdb, /function isDisplayable/, "the display filter must live in the tmdb layer");

  // Both branches, counted. One occurrence is not enough: the original defect was
  // precisely that TV filtered and movie did not, so "the filter exists somewhere" is the
  // same weak assertion that let it through.
  const filterSites = (tmdb.match(/results: all\.filter\(isDisplayable\)/g) || []).length;
  assert.equal(
    filterSites,
    2,
    `both the tv and movie branches must filter; found ${filterSites} of 2`
  );
  assert.match(
    tmdb,
    /rawCount: all\.length/,
    "the pre-filter count must survive, or a page of posterless titles reads as an exhausted source"
  );
  assert.match(
    actions,
    /if \(batch\.rawCount === 0\)/,
    "loadBrowsePage must end the source on an empty RAW page, not a filtered one"
  );
  assert.match(search, /undisplayable/, "fetchSearchResults must distinguish matches-with-no-artwork from no matches");
  const undisplayableIndex = searchPage.indexOf("data.undisplayable");
  assert.ok(undisplayableIndex > -1, "the search page must render that case");
  assert.ok(
    outageIndex < undisplayableIndex && undisplayableIndex < emptyIndex,
    "outage, then undisplayable, then genuinely empty -- in that order"
  );
});

// --- search page fill --------------------------------------------------------
//
// The grid bug this guards: a "load more" used to return one TMDB page of 20 minus
// whatever the poster filter dropped, and search used to render `.poster-grid-dense`
// (2/3/4/5/6 columns), which 20 does not divide. Any count that is not a multiple of the
// grid's column counts leaves a ragged final row. These assert the two things that
// actually fix it -- the target divides every column count, and the loader fills to that
// target across several upstream pages.

test("search page size divides every poster-grid column count", () => {
  const search = readFileSync(new URL("../lib/search.ts", import.meta.url), "utf8");
  const match = search.match(/SEARCH_PAGE_SIZE\s*=\s*(\d+)/);
  assert.ok(match, "lib/search.ts should declare SEARCH_PAGE_SIZE");

  const size = Number(match[1]);
  // Keep in step with .poster-grid in app/globals.css.
  for (const columns of [2, 4, 5]) {
    assert.equal(
      size % columns,
      0,
      `a page of ${size} leaves a short final row at ${columns} columns`
    );
  }
});

test("search fills the page across TMDB pages instead of returning a single one", () => {
  const search = readFileSync(new URL("../lib/search.ts", import.meta.url), "utf8");

  assert.ok(
    /for\s*\(\s*let offset\s*=\s*0;[\s\S]*?offset \+= 1\s*\)/.test(search),
    "fetchSearchResults should loop over successive TMDB pages"
  );
  assert.ok(
    /filtered\.length < SEARCH_PAGE_SIZE/.test(search),
    "the loop condition should be the post-filter count, not the raw one"
  );
  assert.ok(
    /filtered\.slice\(0, SEARCH_PAGE_SIZE\)/.test(search),
    "the result must be trimmed to the page size; batches overshoot and 64 is ragged at 6 columns"
  );
  assert.ok(
    /MAX_EMPTY_PAGES/.test(search),
    "a run of unusable pages must be bounded, or an obscure query crawls the catalogue"
  );
});

test("search resumes where the previous batch stopped and never repeats a title", () => {
  const search = readFileSync(new URL("../lib/search.ts", import.meta.url), "utf8");

  assert.ok(
    /nextPage:\s*page \+ consumed/.test(search),
    "one logical page spans several TMDB pages, so advancing by 1 re-fetches titles on screen"
  );
  assert.ok(
    /exclude/.test(search) && /seen\.has/.test(search),
    "the client cursor overlaps the server-rendered batch and must exclude what is already shown"
  );
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
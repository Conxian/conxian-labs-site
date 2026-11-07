# Stop reporting cold free-tier runtimes as down, and render the status icons

Refs Labs #140 (evidence-backed status truth); Business #1733.

## Problem

Two defects combine to make the public platform-status surface look broken when
every service is actually healthy.

1. **False "unreachable" / false major outage.** The site probes each service's
   public health endpoint once with a single 12s timeout. All three runtimes are
   Render **free** instances, which spin down when idle and pay a cold start on
   the next request. A cold start routinely exceeds 12s, so the first probe after
   idle aborted and the runtime was classified `unreachable`. When the page was
   itself idle, all three were probed at once and all three could abort, which
   rendered "No service verified" / `major-outage` for a healthy system. A live
   capture showed BOS answering in 14.8s — under the old timeout it would have
   been reported down while it was up.

   Warming the services permanently is not an affordable fix: Render grants
   **750 free instance-hours per workspace per month**, while three always-on
   services need roughly **2,160**. The defect is in how we probe and report, not
   in service health.

2. **Broken icons.** `icons.js` replaced the ~2MB Material Symbols CDN with inline
   SVGs. `bolt` and `monitor_heart` are used in the homepage markup but were never
   added to that map, so they rendered as literal text (`monitor_heart`) in the
   status card.

## Change

- Probe each service up to 3 attempts within a 60s budget, retrying only on
  transport failure or timeout. An HTTP error status is an honest answer and is
  not retried. `unreachable` now means the runtime stayed unresponsive across
  every attempt.
- Record `attempts` and `coldStart` per service, and expose `coldStarts` plus the
  effective `probe` budget in `/api/status`, so a slow wake-up is disclosed
  rather than hidden or mistaken for an outage.
- Coalesce concurrent callers onto one probe sweep, so a burst of requests after
  cache expiry cannot stampede the free-tier runtimes.
- Add the missing `bolt` and `monitor_heart` SVGs to `icons.js`.
- Update the `/status` page copy and card notes to describe the retry budget and
  label a cold start as a slow wake-up.
- Add regression tests for cold-start recovery, exhausted retries, no-retry on
  HTTP error, request coalescing, the reported budget, and icon-map completeness.
- Wire `status-truth.test.cjs` and `icon-map.test.cjs` into `npm run test:api`;
  the status-truth suite existed but was not run by CI.

## Boundaries

No route, DNS, payment, runtime credential, environment variable, or deployment
change. `STATUS_PRODUCTION_SERVICES` commissioning semantics are unchanged, and
existing `/api/status` fields are retained (additive only). `npm run test:api`
runs these tests locally because the Playwright config only collects `.spec.ts`;
CI already invokes `test:api` in `ci.yml`.

## Acceptance

- Cold start that answers on retry is `operational`, not `unreachable`.
- A runtime that never answers stays `major-outage` after exactly the configured
  attempts.
- HTTP 503 is not retried and remains honestly `unreachable`.
- Concurrent callers share one probe sweep.
- Every icon referenced in markup is defined in `icons.js`.
- `npm run test:api` (30 tests) and `npx playwright test` (39 tests) pass.

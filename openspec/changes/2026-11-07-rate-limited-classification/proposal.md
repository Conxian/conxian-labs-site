# Treat HTTP 429 as rate-limited, not as an outage

Refs Labs #140 (evidence-backed status truth); Business #1733.

## Problem

`/api/status` classified every non-expected HTTP status as `unreachable`. That
was defensible for a genuine 5xx, but it mis-handles **HTTP 429**.

A 429 is an *answer*: DNS resolved, TLS completed, and the application edge
replied. The runtime is alive and is throttling the caller. Folding it into
`unreachable` produced a false `major-outage` — "No service verified" — for a
system that was demonstrably reachable.

This was observed in production. Rapid polling of `/api/status` caused
Cloudflare to rate-limit the origin; all three probes returned 429 in 300–650ms
and the panel rendered `major-outage`. After a pause it returned to operational
3/3. The outage was caused by the observer, not the services.

Treating 429 as an outage also inflates incident counts and can page on a
condition that means "slow down", not "broken".

## Change

Classify HTTP 429 as a distinct `rate-limited` state.

- `classifyProbe` sets `rateLimited` when the status is 429 and marks the
  service `reachable`. A throttled answer cannot prove identity, so it is never
  `verified`.
- `buildSnapshot` excludes `rate-limited` from the unhealthy set, so a throttled
  prober no longer drives the banner to `major-outage`. It is reported in a new
  `rateLimited` counter and per-service field.
- The status page renders a `Rate limited` pill with a note explaining that DNS,
  TLS and the application edge all responded.
- The homepage hero card reports `rate limited` rather than `unreachable`, and
  no longer claims "All services verified" when the run only proved
  reachability.

Mapping:

| Result | Status |
| --- | --- |
| 200 (expected) + identity match | `operational` |
| 200 + wrong identity | `unverified` |
| 200 + `safety_mode` | `degraded` |
| **429** | **`rate-limited`** |
| other 4xx/5xx | `unreachable` |
| timeout / transport error | `unreachable` |

## Verification

- `npm run test:api` — 34 pass, including four new cases: 429 is rate-limited and
  reachable but not verified; a fully throttled sweep does not raise a major
  outage; 429 is not retried; a genuine outage alongside throttling still
  reports `partial-outage`.
- `npx playwright test` — 39 pass.
- Browser check against a stubbed 429 sweep: label reads
  "Reachable — 3 rate limited, none verified", pills read "Rate limited", and
  the explanatory note renders on each card.

---
name: conxian-status-truth
description: This skill should be used when editing the status page, `/api/status`, the homepage status card, or any copy or UI that reports service reachability for Conxian Labs.
---

# Status truth

The status surface must never claim more than the probe returned. It is the
site's most falsifiable claim, and it has a documented history of false outages.

## Probe model (`server.js` -> `/api/status`)

- Three runtimes are probed: `bos` (`bos.conxian-labs.com`), `gateway`
  (`gateway.conxian.org`), `nexus` (`nexus.conxian.org`). Published libraries
  (Market, Enclave SDK, Corelibs) are **not** probed — they are catalogued in
  `/api/services` as libraries.
- Each service is probed up to `PROBE_ATTEMPTS` (3) within
  `PROBE_TOTAL_BUDGET_MS` (60s). Only transport failures/timeouts are retried.
- Results are cached `PROBE_CACHE_MS` (30s) and concurrent callers share one
  sweep. **Do not poll faster than the cache**; tight loops trigger a
  self-inflicted Cloudflare 429 sweep.

## State mapping (do not collapse these)

| Result | State | Verified? |
|---|---|---|
| 200 + identity match, not alias, not safety mode | `operational` | yes |
| 200 + wrong identity | `unverified` | no |
| 200 + `safety_mode` | `degraded` | no |
| 429 | `rate-limited` | no (reachable) |
| other 4xx/5xx | `unreachable` | no |
| timeout / transport error after all attempts | `unreachable` | no |

- A 429 is an **answer**: DNS, TLS and the edge responded. It is `rate-limited`,
  reachable, never `verified`, and never raises `major-outage`.
- `unreachable` means every attempt failed. A cold free-tier wake-up that
  answers on retry is `operational` with `coldStart: true`, not an outage.
- Never add a keep-alive to hide cold starts: Render grants 750 free
  instance-hours/month per workspace and three always-on services need ~2,160.

## Commissioning

`STATUS_PRODUCTION_SERVICES` is an explicit operational decision (comma-separated
IDs). Nothing is production by default; outage math is scoped to commissioned
IDs only.

## UI expectations

- Sort problems first (`unreachable`, `rate-limited`, `degraded`, `unverified`,
  `alias`, `operational`) so a reader sees faults at the top.
- Disclose the probe budget, attempt count, cold starts, and cache TTL. The
  refresh countdown is driven by `cacheTtlMs`, not a fixed 30s guess.
- Fail visible: on probe error the banner says so rather than showing green.

## Tests

`npm run test:api` runs `tests/status-truth.test.cjs` (14 cases covering identity
mismatch, safety mode, cold starts, retry exhaustion, 429 classification,
coalescing, and the reported budget). Keep them green.

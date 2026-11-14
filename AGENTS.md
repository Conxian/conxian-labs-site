# Conxian Labs Site — Development Context

## Build & Test
- **Install:** `npm install`
- **Dev server:** `npm start` (Express on port 3000)
- **Test:** `npx playwright test` (or `npm test`) — Playwright suite
- **Test (API/Node):** `npm run test:api` — Node API suite (onboarding, discovery, status truth, icon map, search index, page CSS hygiene, managed-tier gate, rate limit, site facts)
- **Test (single file):** `npx playwright test tests/nav-dropdown.spec.ts`
- **Debug tests:** `npx playwright test --headed`
- **Browser install:** `npx playwright install --with-deps chromium`
- **Node:** v26 (matches `actions/setup-node`, `package.json` engines, and the Render runtime)

## Promotion and release controls

- Ordinary feature/fix/docs work targets `dev`; only `dev` promotes to `staged`; only `staged` promotes to `main`.
- `.github/workflows/branch-promotion-policy.yml` evaluates pull requests to `dev`, `staged`, and `main` using the trusted default-branch policy with read-only permissions. It never checks out or executes PR-controlled code.
- `scripts/branch_promotion_policy.py` validates the route, immutable promotion source/target/window, and the machine-checkable Mainnet Acceptance Evidence Pack. No bootstrap exception is configured for this repository.
- `ci.yml` runs `python3 -m unittest scripts.tests.test_branch_promotion_policy`.
- A staged-to-main candidate must have a completed evidence pack, exact-head required checks, genuine independent review, and the configured required status check. Do not infer acceptance from a green homepage or deployment signal.
- **Promotion gate is enforced (verified by read-back):** the `main` ruleset (`23017156`, active) requires `Enforce branch promotion rules` alongside the scan/build contexts. Issue #233 is closed. The policy is fail-closed — no bootstrap exception is configured.

## Deployment Environments

| Environment | Target | URL | Branch |
|---|---|---|---|
| `production` | Render | `www.conxian-labs.com` | `main` (gated by `deploy.yml`) |

- **Production (Render)**: **Authoritative host.** Auto-deploys via `deploy.yml` signal → Render detects `main` push; pull request previews enabled (Oregon region). Service: `conxian-labs-site` (Node.js web service).
- **GitHub Pages (legacy)**: **Disabled 2026-08-02.** The org-level Pages surface (`conxian.github.io` → `pages.conxian-labs.com`) is a separate concern and does not duplicate production authority.

## Architecture
- **Server:** Express.js (Node.js) — dynamic web service with static file serving
- **Templates:** HTML5/CSS3/Vanilla JS — server-side routing, client-side interactivity
- **Homepage** (`index.html`): Purged Tailwind CSS (13.9KB, no CDN)
- **Sub-pages** (12 pages under route directories): shared `package-page.css`
- **Standalone pages** (`404.html`): own design with shared tokens from `css/common.css`
- **Shared logging:** `logger.js` (IIFE singleton)
- **Fonts:** Self-hosted JetBrains Mono in `fonts/` (676K, 6 weights) — no Google Fonts CDN
- **Shared CSS:** `css/common.css` — design tokens, body reset, logo, utility classes
- **Icons:** `icons.js` — inline SVG replacements (no Material Symbols CDN). Any icon used in markup MUST be defined here or it renders as literal text. `tests/icon-map.test.cjs` enforces this.
- **Navigation** (`nav.js`): renders the header, footer, and mobile menu at runtime on every page. Desktop dropdowns use hover intent — a ~60ms open delay, a ~220ms close grace, and a CSS bridge (`.cx-menu-panel::before`) spanning the trigger-to-panel gap, so the menu stays open while the pointer travels into it. A hover-opened menu is pinned by a click (the click does not toggle it shut); a second click closes it. `ArrowDown`/`ArrowUp`/`Escape`/`Tab` are handled. `tests/nav-dropdown.spec.ts` covers all of this.
- **Search** (`search.js`): hand-maintained client-side index. Every `url` must resolve to a real file and every `#anchor` to a real `id`; `tests/search-index.test.cjs` enforces both.
- **Status probes** (`server.js` → `/api/status`): services are Render **free** instances that cold-start, so each is probed up to `PROBE_ATTEMPTS` (3) times within `PROBE_TOTAL_BUDGET_MS` (60s). Only transport failures/timeouts are retried; an HTTP error status is an honest answer. `unreachable` means every attempt failed. HTTP **429** is classified `rate-limited`, not `unreachable`: the edge answered, so DNS/TLS/edge are proven alive, but identity cannot be confirmed while throttled, so it is never `verified` and never raises `major-outage`. Reported as `rateLimited`. The snapshot also reports `cacheTtlMs` (`PROBE_CACHE_MS`, 30s) so the status page times its refresh to the real cache boundary. Do not poll `/api/status` faster than the 30s cache; tight loops throttle the origin and produce a self-inflicted 429 sweep. Override via `STATUS_PROBE_ATTEMPTS`, `STATUS_PROBE_ATTEMPT_TIMEOUT_MS`, `STATUS_PROBE_BACKOFF_MS`, `STATUS_PROBE_TOTAL_BUDGET_MS`. Do not "fix" cold starts by adding a keep-alive: Render allows only 750 free instance-hours/month per workspace, and three always-on services need ~2,160.
- **Dynamic API:** `GET /api/health`, `GET /api/site-map`, `GET /api/status`, `GET /api/services`, `GET /api/pricing/managed`
- **Deploy:** Render web service (`conxian-labs-site`), Node.js environment
- **Repo skills** (`.agents/skills/`): repo-scoped guidance for agents — `conxian-design-system`, `conxian-nav-and-search`, `conxian-status-truth`, `conxian-evidence-claims`

## Design System ("Ivory Foundation")
- **Background:** `#FDFBF7` (Ivory)
- **Surface:** `#FFFFFF` (White panels)
- **Primary accent:** `#C25E00` (Earthy Orange)
- **Brand secondary:** `#2E403B` (Deep Forest Green)
- **Text main:** `#121212` | **Text dim:** `#555555`
- **Font:** JetBrains Mono (all typography)
- **Border radius:** 4px (sharp institutional)
- **Logos:** black background, grayscale + brightness filter

## Page Inventory (18 routes)
Every page renders the shared header (`#cx-nav`) and footer (`#cx-footer`) via
`nav.js`; the "Nav?" column marks whether the page also appears in the primary
desktop menus.

| Route | File | In nav? |
|-------|------|---------|
| `/` | `index.html` | ✅ |
| `/sdk` | `sdk/index.html` | ✅ |
| `/docs` | `docs/index.html` | ✅ |
| `/pricing` | `pricing/index.html` | ✅ (direct link) |
| `/partners` | `partners/index.html` | ✅ |
| `/operators` | `operators/index.html` | ✅ |
| `/enterprise` | `enterprise/index.html` | ✅ |
| `/research` | `research/index.html` | ✅ |
| `/terms` | `terms/index.html` | ✅ |
| `/about` | `about/index.html` | ✅ |
| `/security` | `security/index.html` | ✅ |
| `/privacy` | `privacy/index.html` | ✅ |
| `/commercial` | `commercial/index.html` | ✅ |
| `/commercial/pilot` | `commercial/pilot/index.html` | ✅ (via Commercial) |
| `/bos` | `bos/index.html` | ✅ |
| `/status` | `status/index.html` | ✅ (via Developers) |
| `/get-started` | `get-started/index.html` | ✅ (via Developers) |
| `/console` | `console/index.html` | ✅ (direct link) |
| `/404.html` | `404.html` | — |

## Ecosystem Facts (verified against the org, do not drift)

- **Public org repos (10, non-archived):** `lib-conxian-core`, `conxian-nexus`, `conxian-gateway`, `conxian_market` (**underscore**, not a hyphen), `conxius-wallet`, `conxius-platform`, `conxius-enclave-sdk`, `conxian-labs-site`, `conxian-org-site`, `.github`. (`conxian-business` is **private** — it backs the BOS control plane and must not be linked from a public page.)
- **Do not link `conxian-market`, `conxian_ui`, `conxius-docs`, or `conxian-infrastructure`** — those paths 404. `conxian_ui` / `conxius-docs` / `conxian-infrastructure` are retired or renamed.
- **Licenses (repo `LICENSE` is authoritative):** nexus **AGPL-3.0**; `conxian-org-site` **Apache-2.0**; core, gateway, wallet, enclave-sdk, platform, market, site, `.github` = MIT. The stack is **not** uniformly MIT. `tests/site-facts.test.cjs` pins the Nexus license so it cannot silently revert to the retired BUSL-1.1 label.
- **Product name:** the canonical label is **Conxius Enclave SDK**; "Conclave SDK" is retired and must not appear as a public label.
- **Status probes are runtime-scoped:** only **BOS, Gateway, Nexus** are commissioned runtimes in `/api/status`. Market/SDK/Corelibs/Platform are catalogued libraries, not probed services — do not claim they are probed.
- **Managed checkout rail:** ADR-009 makes the gateway the single monetization surface; the sanctioned rail is Lightning subscription, **not** a card Merchant of Record. The gate is `MANAGED_BILLING_BASE_URL` (absence ⇒ managed tier unavailable). `MERCHANT_CHECKOUT_URL` is retired.

## Known Issues
- **CI is org-locked (account billing):** every Actions job across the org is created but runs **0 steps** and fails in 2–3s with *"The job was not started because your account is locked due to a billing issue."* The lock is **billing arrears**: a card is on file, but the account is blocked until the outstanding balance is settled (owner-stated). Net usage is well under budget, so this is a lock, not a spend cap. Making a repo public does **not** clear it (tested). **Owner action:** settle the outstanding balance (Organization → Billing & plans). Until then no required check can go green and `staged→main` cannot produce genuine CI evidence.
- **Promotion gate is enforced:** `main` requires `Enforce branch promotion rules` (ruleset `23017156`); issue #233 is closed. The gate is fail-closed from first install — the CI lock above, not a missing gate, is what blocks a genuine `staged→main` acceptance.
- **No automated CSS pipeline** — Tailwind build requires manual `npm run build:css` when classes change
- **Custom domain ownership split** — `www.conxian-labs.com` (proxied CNAME) and the apex (proxied CNAME, redirects to `www`) both resolve to `conxian-labs-site.onrender.com`; `control.conxian-labs.com` is now a Cloudflare 301 redirect to `bos.conxian-labs.com` (Vercel removed 2026-11-03).

## CI/CD
- `.github/workflows/ci.yml` — build-and-test + security-scan (gitleaks) on push/PR to main, staged, and dev; also runs the branch-promotion policy unit tests.
- `.github/workflows/branch-promotion-policy.yml` — read-only, trusted-default-branch promotion enforcement for PRs targeting main/staged/dev.
- `.github/workflows/auto-promotion.yml` — opens immutable promotion candidates: on push to `dev`/`staged` (`dev`→`staged`, `staged`→`main`) and an hourly soak re-check that promotes `staged`→`main` once `MIN_MAINNET_DWELL_HOURS` (default 12) is met.
- `.github/workflows/deploy.yml` — deployment signal on push to main (`environment: production`)
- `.github/workflows/dependency-review.yml` — on PR when lockfiles change
- **Render**: auto-deploy from `main` → `conxian-labs-site` (Node.js web service, `environment: production`)
- **GitHub Pages**: org-level (`conxian.github.io` → `pages.conxian-labs.com`), separate from this repo's pipeline; repo-level Pages retired

## Integration Landscape

| Service | Projects / Resources | Status |
|---|---|---|
| **Render** | `conxian-labs-site` (srv-<redacted>) — Node.js web, free, Oregon | ✅ Deployed (v1.1.0) |
| **Supabase** | `Conxian BOS` (supabase-ref-redacted) — PG 17.6, eu-central-1 | ✅ ACTIVE_HEALTHY |
| **Supabase** | `Conxian-platform` (supabase-ref-redacted) — PG 17.6, eu-central-1 | ✅ ACTIVE_HEALTHY |
| **NEON** | `Gateway` (neon-ref-redacted) — PG 18, aws-ap-southeast-1 | ✅ Active |
| **NEON** | `Conxian Nexus` (neon-ref-redacted) — PG 17, aws-eu-central-1 | ✅ Active |

- **Render custom domain**: `www.conxian-labs.com` resolves to `conxian-labs-site.onrender.com` (proxied CNAME); the apex `conxian-labs.com` is a proxied CNAME to the same origin and redirects to `www`. `control.conxian-labs.com` is a Cloudflare 301 redirect to `bos.conxian-labs.com` (Vercel removed 2026-11-03).
- **NEON org**: `neon-org-ref-redacted` (personal API key) — inventory retained privately in `.github-private/restricted/2026-11-14/`
- **Supabase org**: `supabase-org-ref-redacted` (PAT `sbp_...`)

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

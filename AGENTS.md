# Conxian Labs Site — Development Context

## Build & Test
- **Install:** `npm install`
- **Dev server:** `npm start` (Express on port 3000)
- **Test:** `npx playwright test` (or `npm test`) — 45 Playwright cases
- **Test (API/Node):** `npm run test:api` — 38 Node cases (onboarding, discovery, status truth, icon map, search index)
- **Test (single file):** `npx playwright test tests/nav-dropdown.spec.ts`
- **Debug tests:** `npx playwright test --headed`
- **Browser install:** `npx playwright install --with-deps chromium`
- **Node:** v24 (matches `actions/setup-node` in CI and the Render runtime)

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

## Known Issues
- **`production` environment has no branch protection** — relies solely on `deploy.yml` `branches: [main]` filter
- **No automated CSS pipeline** — Tailwind build requires manual `npm run build:css` when classes change
- **Custom domain ownership split** — `www.conxian-labs.com` (proxied CNAME) and the apex (proxied CNAME, redirects to `www`) both resolve to `conxian-labs-site.onrender.com`; `control.conxian-labs.com` is now a Cloudflare 301 redirect to `bos.conxian-labs.com` (Vercel removed 2026-11-03).

## CI/CD
- `.github/workflows/ci.yml` — build-and-test + security-scan (gitleaks) on push/PR to main
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
| **NEON** | `Gateway` (noisy-cloud-41146057) — PG 18, aws-ap-southeast-1 | ✅ Active |
| **NEON** | `Conxian Nexus` (orange-paper-76209725) — PG 17, aws-eu-central-1 | ✅ Active |

- **Render custom domain**: `www.conxian-labs.com` resolves to `conxian-labs-site.onrender.com` (proxied CNAME); the apex `conxian-labs.com` is a proxied CNAME to the same origin and redirects to `www`. `control.conxian-labs.com` is a Cloudflare 301 redirect to `bos.conxian-labs.com` (Vercel removed 2026-11-03).
- **NEON org**: `org-silent-sun-00457600` (personal API key)
- **Supabase org**: `dmhmarjqzgodyovlhamv` (PAT `sbp_...`)

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

# Conxian Labs Site — Development Context

## Build & Test
- **Install:** `npm install`
- **Dev server:** `npm start` (Express on port 3000)
- **Test:** `npx playwright test` (or `npm test`)
- **Test (single file):** `npx playwright test tests/design-compliance.spec.ts`
- **Debug tests:** `npx playwright test --headed`
- **Browser install:** `npx playwright install --with-deps chromium`
- **Node:** v20+

## Deployment Environments

| Environment | Target | URL | Branch |
|---|---|---|---|
| `production` | Render | `www.conxian-labs.com` | `main` (gated by `deploy.yml`) |

- **Production (Render)**: **Authoritative host.** Auto-deploys via `deploy.yml` signal → Render detects `main` push; pull request previews enabled (Oregon region). Service: `conxian-labs-site` (Node.js web service).
- **GitHub Pages (legacy)**: Formerly active on this repo; now **retired** in favor of Render. The org-level Pages surface (`conxian.github.io` → `pages.conxian-labs.com`) is a separate concern and does not duplicate production authority. This repo's Pages configuration should be disabled to prevent HTTPS certificate conflicts with Render.

## Architecture
- **Server:** Express.js (Node.js) — dynamic web service with static file serving
- **Templates:** HTML5/CSS3/Vanilla JS — server-side routing, client-side interactivity
- **Homepage** (`index.html`): Purged Tailwind CSS (13.9KB, no CDN)
- **Sub-pages** (12 pages under route directories): shared `package-page.css`
- **Standalone pages** (`404.html`): own design with shared tokens from `css/common.css`
- **Shared logging:** `logger.js` (IIFE singleton)
- **Fonts:** Self-hosted JetBrains Mono in `fonts/` (676K, 6 weights) — no Google Fonts CDN
- **Shared CSS:** `css/common.css` — design tokens, body reset, logo, utility classes
- **Icons:** `icons.js` — inline SVG replacements (no Material Symbols CDN)
- **Search:** `search.js` — client-side search across all site pages
- **Dynamic API:** `GET /api/health`, `GET /api/site-map`
- **Deploy:** Render web service (`conxian-labs-site`), Node.js environment

## Design System ("Ivory Foundation")
- **Background:** `#FDFBF7` (Ivory)
- **Surface:** `#FFFFFF` (White panels)
- **Primary accent:** `#C25E00` (Earthy Orange)
- **Brand secondary:** `#2E403B` (Deep Forest Green)
- **Text main:** `#121212` | **Text dim:** `#555555`
- **Font:** JetBrains Mono (all typography)
- **Border radius:** 4px (sharp institutional)
- **Logos:** black background, grayscale + brightness filter

## Page Inventory (15 pages)
| Route | File | Nav? | Footer? |
|-------|------|------|---------|
| `/` | `index.html` | ✅ | ✅ (3 columns) |
| `/sdk` | `sdk/index.html` | ✅ | ✅ |
| `/docs` | `docs/index.html` | ✅ | ✅ |
| `/pricing` | `pricing/index.html` | ✅ | ✅ |
| `/partners` | `partners/index.html` | ✅ | ✅ |
| `/operators` | `operators/index.html` | ✅ | ✅ |
| `/enterprise` | `enterprise/index.html` | ✅ | ✅ |
| `/research` | `research/index.html` | ✅ | ✅ |
| `/terms` | `terms/index.html` | ✅ | ✅ |
| `/about` | `about/index.html` | ✅ | ✅ |
| `/security` | `security/index.html` | ✅ | ✅ |
| `/privacy` | `privacy/index.html` | ✅ | ✅ |
| `/commercial` | `commercial/index.html` | ❌ | ✅ |
| `/commercial/pilot` | `commercial/pilot/index.html` | ❌ | ✅ |
| `/404.html` | `404.html` | ✅ | ✅ (minimal) |

## Known Issues
- **`production` environment has no branch protection** — relies solely on `deploy.yml` `branches: [main]` filter
- **No automated CSS pipeline** — Tailwind build requires manual `npm run build:css` when classes change

## CI/CD
- `.github/workflows/ci.yml` — build-and-test + security-scan (gitleaks) on push/PR to main
- `.github/workflows/deploy.yml` — deployment signal on push to main (`environment: production`)
- `.github/workflows/dependency-review.yml` — on PR when lockfiles change
- **Render**: auto-deploy from `main` → `conxian-labs-site` (Node.js web service, `environment: production`)
- **GitHub Pages**: org-level (`conxian.github.io` → `pages.conxian-labs.com`), separate from this repo's pipeline; repo-level Pages retired

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

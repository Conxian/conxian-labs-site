# Conxian Labs Site — Development Context

## Build & Test
- **Install:** `npm install`
- **Test:** `npx playwright test` (or `npm test`)
- **Test (single file):** `npx playwright test tests/design-compliance.spec.ts`
- **Debug tests:** `npx playwright test --headed`
- **Browser install:** `npx playwright install --with-deps chromium`
- **Node:** v20+

## Deployment Environments

| Environment | Target | URL | Branch |
|---|---|---|---|
| `production` | Render | `www.conxian-labs.com` | `main` (gated by `deploy.yml`) |

- **Production (Render)**: Auto-deploys via `deploy.yml` signal → Render detects `main` push; pull request previews enabled (Oregon region)
- **GitHub Pages**: Org-level via `conxian.github.io` repo — covers all project repos at `pages.conxian-labs.com`, no per-repo environment needed

## Architecture
- Static HTML5/CSS3/Vanilla JS — no build step, no framework
- **Homepage** (`index.html`): Purged Tailwind CSS (13.9KB, no CDN)
- **Sub-pages** (10 pages under `sdk/`, `docs/`, `pricing/`, `partners/`, `operators/`, `enterprise/`, `research/`, `terms/`, `about/`, `security/`, `privacy/`): shared `package-page.css`
- **Standalone pages** (`404.html`): own design with shared tokens from `css/common.css`
- **Shared logging:** `logger.js` (IIFE singleton)
- **Fonts:** Self-hosted JetBrains Mono in `fonts/` (676K, 6 weights) — no Google Fonts CDN
- **Shared CSS:** `css/common.css` — design tokens, body reset, logo, utility classes
- **Icons:** `icons.js` — inline SVG replacements (no Material Symbols CDN)
- **Search:** `search.js` — client-side search across all 12 site pages (homepage + all sub-pages)
- **Deploy:** Render static site (`conxian-labs-static-v1`)

## Design System ("Ivory Foundation")
- **Background:** `#FDFBF7` (Ivory)
- **Surface:** `#FFFFFF` (White panels)
- **Primary accent:** `#C25E00` (Earthy Orange)
- **Brand secondary:** `#2E403B` (Deep Forest Green)
- **Text main:** `#121212` | **Text dim:** `#555555`
- **Font:** JetBrains Mono (all typography)
- **Border radius:** 4px (sharp institutional)
- **Logos:** black background, grayscale + brightness filter

## Page Inventory (13 pages)
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
| `/404.html` | `404.html` | ✅ | ✅ (minimal) |

## Known Issues
- **`production` environment has no branch protection** — relies solely on `deploy.yml` `branches: [main]` filter
- **No automated CSS pipeline** — Tailwind build requires manual `npm run build:css` when classes change

## CI/CD
- `.github/workflows/ci.yml` — build-and-test + security-scan (gitleaks) on push/PR to main
- `.github/workflows/deploy.yml` — deployment signal on push to main (`environment: production`)
- `.github/workflows/dependency-review.yml` — on PR when lockfiles change
- **Render**: auto-deploy from `main` → `conxian-labs-static-v1` (environment: `production`)
- **GitHub Pages**: org-level (`conxian.github.io` → `pages.conxian-labs.com`), separate from this repo's pipeline

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

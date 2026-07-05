# Conxian Labs Site — Development Context

## Build & Test
- **Install:** `npm install`
- **Test:** `npx playwright test` (or `npm test`)
- **Test (single file):** `npx playwright test tests/design-compliance.spec.ts`
- **Debug tests:** `npx playwright test --headed`
- **Browser install:** `npx playwright install --with-deps chromium`
- **Node:** v20+

## Architecture
- Static HTML5/CSS3/Vanilla JS — no build step, no framework
- **Homepage** (`index.html`): Tailwind CDN + inline styles
- **Sub-pages** (`sdk/`, `docs/`, `pricing/`, `partners/`, `operators/`, `enterprise/`, `research/`, `terms/`): shared `package-page.css`
- **Standalone pages** (`privacy.html`, `404.html`): inline CSS (own design)
- **Shared logging:** `logger.js` (IIFE singleton, loaded via `<script>` tag)
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

## Page Inventory (11 pages)
| Route | File | Nav? | Footer? |
|-------|------|------|---------|
| `/` | `index.html` | ✅ | ✅ (minimal) |
| `/sdk` | `sdk/index.html` | ✅ | ✅ |
| `/docs` | `docs/index.html` | ✅ | ✅ |
| `/pricing` | `pricing/index.html` | ✅ | ✅ |
| `/partners` | `partners/index.html` | ✅ | ✅ |
| `/operators` | `operators/index.html` | ✅ | ✅ |
| `/enterprise` | `enterprise/index.html` | ✅ | ✅ |
| `/research` | `research/index.html` | ✅ | ✅ |
| `/terms` | `terms/index.html` | ✅ | ✅ |
| `/privacy.html` | `privacy.html` | ❌ | ❌ |
| `/404.html` | `404.html` | ❌ | ❌ |

## Known Issues
- **Tailwind CDN in production** — `index.html` loads Tailwind from CDN, causes Google tracking/privacy drift
- **3 separate CSS implementations** — homepage (Tailwind), sub-pages (package-page.css), privacy/404 (inline)
- **Search bar is decorative only** — no handler or form action
- **Google Fonts + Material Symbols CDNs** — enable third-party tracking, contradict privacy policy
- **Homepage "Explore ecosystem" and "View repositories"** both link to same `https://github.com/Conxian`
- **"Get SDK" button** in header is a `<button>` wrapping an `<a>` — invalid HTML

## CI/CD
- `.github/workflows/ci.yml` — build-and-test + security-scan (gitleaks) on push/PR to main
- `.github/workflows/deploy.yml` — deployment signal on push to main
- `.github/workflows/dependency-review.yml` — on PR when lockfiles change

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

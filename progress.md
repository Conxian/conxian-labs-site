# Conxian Labs Site Remediation Progress

## Recent Fixes (2026-07-05)
- **Enterprise nav orphan fixed**: Added Enterprise to all page navigations (header + footer) across all 11 pages. Enterprise page previously existed but was unreachable.
- **Enterprise page active state**: Fixed — own nav now correctly highlights Enterprise, not Research.
- **Deploy decoupled from test**: `render.yaml` `buildCommand` changed from `npm install && npm run test` to `npm install`. Tests run in CI, not at deploy time.
- **AGENTS.md**: Updated with full development context (build/test commands, architecture, page inventory, known issues, CI/CD).
- **Homepage CTA dedup**: "View repositories" button changed to "Enterprise" linking to `/enterprise`.
- **Invalid HTML fixed**: "Get SDK" `<button>` wrapping an `<a>` replaced with a clean `<a>` tag.
- **Official Service Established**: Created `conxian-labs-site-official` (srv-d954bv8js32c73fd3lqg) to serve as the canonical deployment surface, ensuring alignment with org-wide hardening standards.

## Render Audit Findings
- **Missing Configuration**: No `render.yaml` exists in the repository.
- **Service Discrepancy**: Render MCP shows a `conxian-ui` service, but it points to the `conxian_ui` repository. The `conxian-labs-site` repository needs its own Render configuration.
- **Deployment Type**: As a static site (HTML/CSS), it should be deployed as a Render Static Site for optimal performance and cost.

## Log Audit Findings
- **Zero Instrumentation**: No client-side logging, error tracking, or telemetry found in `index.html` or sub-pages.
- **Missing Error Guards**: No `window.onerror` or `window.onunhandledrejection` handlers to capture runtime failures.
- **No Performance Tracking**: No instrumentation for Page Load, TTFB, or other core web vitals.

## Remediations Planned
1. **Standardize Render Deployment**: Create `render.yaml` for static site deployment.
2. **Institutional Logging**: Implement a centralized `Logger` utility.
3. **Global Error Handling**: Add global error listeners to all pages.
4. **Health Check**: Add a hidden health-check endpoint/flag for automated monitoring.

## Implementation Notes
- **render.yaml**: Added with security headers (CSP, X-Frame-Options, X-Content-Type-Options) and sub-page rewrites.
- **logger.js**: Implemented as a singleton with module support. Added to all pages.
- **Instrumentation**: Added first-pass instrumentation to terminal animation in `index.html`.
- **Testing**: Added `tests/logging.spec.ts` to verify log availability and error capture.

## Final Verification
- **Test Results**: All tests passed (16/16).
  - `design-compliance.spec.ts`: 5/5 passed.
  - `comprehensive-verification.spec.ts`: 6/6 passed.
  - `logging.spec.ts`: 5/5 passed.
- **Render-Ready**: `render.yaml` verified and ready for deployment.
- **Institutional Alignment**: Logger implementation follows ecosystem standards.

## Functional & Structural Enhancements
- **Sitemap**: Added `sitemap.xml` covering all public routes.
- **Robots.txt**: Added `robots.txt` with sitemap reference.
- **Custom 404**: Added `404.html` with institutional branding and error tracking.
- **SEO Alignment**: Standardized OpenGraph and Description meta-tags across the entire site.
- **Telemetry expansion**: Added route-access logging to all sub-pages.

## Known Gaps
- **No automated CSS pipeline** — Tailwind build requires manual npm run build:css when classes change (Open for future work)
- **3 separate CSS implementations** — homepage, sub-pages, standalone pages use different CSS
- **No conversion path** — no waitlist, newsletter, or contact capture on site** — homepage (purged Tailwind), sub-pages (package-page.css), privacy/404 (inline)
- **Search bar is decorative only** — no handler or form action
- **Tailwind CDN in production** — index.html loads Tailwind from CDN, enabling Google tracking/privacy drift
- **3 separate CSS implementations** — homepage (Tailwind CDN), sub-pages (package-page.css), privacy/404 (inline)
- **Search bar is decorative only** — no handler or form action
- **Google Fonts + Material Symbols CDNs** — enable third-party tracking, contradicting privacy policy claims

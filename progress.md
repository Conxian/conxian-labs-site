# Conxian Labs Site Remediation & Ecosystem Alignment Progress

## Org-wide audit and evidence alignment (2026-11-14)
- **Method**: re-verified every public claim on the site against the org reality (GitHub API repo
  list + `LICENSE` files + canonical naming standard in `conxian-business`), then fixed what was
  provably wrong. Kept changes evidence-grounded per the `conxian-evidence-claims` skill.
- **Broken repo links fixed**: `conxian-market` (404) → `conxian_market` across README, docs,
  commercial, research, search index, and two test files. Removed the dead `conxian_ui` README link.
  `conxius-docs` / `conxian-infrastructure` are not referenced by any live file (only historical
  `progress.md` prose).
- **Wrong license fixed**: Nexus is **AGPL-3.0**, not BUSL-1.1. Corrected in about, docs, research,
  README. The stack is **not** uniformly MIT; each repo `LICENSE` is authoritative.
- **Retired name fixed**: "Conclave SDK" → "Conxius Enclave SDK" in about and terms; the duplicate
  about portfolio card ("Enclave SDK" vs "Conclave SDK") was deduped into one canonical entry.
- **Status truth**: the status search entry and meta description claimed 7 probed surfaces; only
  **BOS, Gateway, Nexus** are commissioned runtimes. Corrected both.
- **Evidence bounds**: softened unsupported absolute claims (reproducible builds, vendored/audited
  third-party code, SBOM-on-every-release, 24h remediation SLA, a public bug-bounty program, "every
  component runs under user control") to state the current posture and the engagement-term boundary.
- **Pricing honesty**: the homepage teaser and the pricing "Plans" section showed invented amounts
  ($200/$2,500) with a "Most popular" badge and hard SLA claims, contradicting the page's own "not a
  live rate card" stance. Reframed as packaging guidance / design references with SLA marked as an
  engagement term. Managed tiers remain gated on `MANAGED_BILLING_BASE_URL`.
- **Deployment config**: `render.yaml` declared a retired `MERCHANT_CHECKOUT_URL` (card Merchant of
  Record); ADR-009's sanctioned rail is Lightning, gated on `MANAGED_BILLING_BASE_URL`. Corrected.
- **Asset cleanup**: deleted the unused 5.7 MB `Conxius-Wallet_Logo.jpg` and the 5.2 MB
  `Conxian_Logo.jpg`; compressed the OG `Conxian-Labs_Logo.jpg` 4.7 MB → 34 KB; replaced the 5 MB
  JPEG favicon with a 0.4 KB `favicon.svg` on all 19 pages. ~16 MB removed from the served tree.
- **Regression guard**: added `tests/site-facts.test.cjs` (wired into `npm run test:api`) pinning the
  repo link, Nexus license, product name, homepage count, `render.yaml` key, and SVG favicon.
- **Verification**: `npm run test:api` 66/66 green; `npx playwright test` 45/45 green;
  `python3 -m unittest scripts.tests.test_branch_promotion_policy` 31/31 green; independent internal
  link/anchor sweep reports all internal links OK.

## Context alignment and rules reconciliation (2026-11-13)
- **Full-context audit**: verified branch chain (`main` d059d19 ⊂ `staged` cf015ff ⊂ `dev` 705b8c2),
  the active `main` ruleset (`23017156`), the three open issues (#115, #135, #138), and live
  production discovery files.
- **Documentation drift corrected**: AGENTS.md still described a "promotion enforcement gap" and an
  open issue #233, both stale. Issue #233 is **closed** and the `main` ruleset **does** require
  `Enforce branch promotion rules`. Replaced the stale entries with the verified state and the real
  blocker (below).
- **Real blocker recorded**: the organization is **account-locked for Actions billing** — every job
  org-wide runs 0 steps and fails in 2–3s with *"account is locked due to a billing issue"*. Root
  cause: **no payment method on file** for the org. This is an owner-only fix and it gates every
  required check, so `staged→main` cannot produce genuine CI evidence until it is resolved.
- **Live state verified**: `/llms.txt`, `/.well-known/security.txt`, `/robots.txt`, `/sitemap.xml`,
  `/api/health` all return 200 from `www.conxian-labs.com`; the homepage carries JSON-LD and
  `/pricing` emits a `Service` + `Offer` generated from `/api/pricing/managed`. So the substance of
  issue #135's requested outcome is already live.
- **Baseline**: `npm run test:api` 54/54 green; `npx playwright test` 45/45 green (Node 24 sandbox;
  `npm install --engine-strict=false` because `engines` pins Node 26 and `.npmrc` sets `engine-strict`).

## Research expansion + dead-CSS remediation (2026-11-10, session 2)
- **Research page expanded** (`research/index.html`) with four evidence-bounded
  sections: Research Integrity & Evidence Tiers (Proposed / Implemented /
  Verified), Supply-Chain & Dependency Security Posture (RustSec, SBOM, ZSE,
  CodeQL, pinned toolchains, licence/provenance), Threat Model: Custody, Keys,
  and Replay, and Open Problems & Research Roadmap. Page now has 11 sections.
  Meta/OG descriptions and the search-index entry were updated to match.
- **Remediation — dead inline CSS removed**: 11 sub-pages (research, security,
  terms, partners, operators, sdk, about, privacy, bos, enterprise, docs) each
  carried a byte-identical inline `.search-bar`/`.search-results` block that was
  always overridden by `css/site.css` (verified by computed-style probe). The
  block was removed and the resulting 9 empty `<style>` blocks deleted.
- **Class-collision fix**: the research page's local `.badge` (light chip) was
  renamed `.proposal-tag` to stop colliding with the global `.badge`
  (white-on-accent) from `package-page.css`.
- **Tests**: added `tests/page-css-hygiene.test.cjs` (3 cases: no page
  re-declares shared search CSS, no empty `<style>`, research keeps `#domains`
  and its new sections), wired into `test:api`. Suite: 45 Playwright + 41 Node.

## Design & business audit, dropdown fix, status enhancement (2026-11-10)
- **Dropdown menus fixed (reproduced bug)**: desktop menus closed the instant the
  pointer left the trigger, so crossing the 8px trigger→panel gap dismissed the
  menu (`open while paused in gap: false`). Rewrote the interaction in `nav.js`:
  ~60ms open delay, ~220ms close grace, a CSS bridge (`.cx-menu-panel::before`)
  spanning the gap, click-pins-a-hovered-menu, and full keyboard support
  (`ArrowDown`/`ArrowUp`/`Escape`/`Tab`). Verified across hover, gap pause, slow
  traverse, click, and keyboard.
- **Nav dedupe/disambiguation**: `Solutions` listed `/enterprise` twice and
  `Developers` listed `/docs` twice; every menu now resolves to distinct
  destinations. Added `BOS` to the Company menu.
- **Search index corrected**: the "Business Operating System (BOS)" entry pointed
  at the Enterprise page although a real `/bos` page exists. Fixed the target and
  added anchors (`docs#gateway`, `docs#core`, `commercial#market`, `research#domains`).
- **Status surface enhanced**: `/api/status` now reports `cacheTtlMs`; the status
  page sorts problems first, shows summary metrics, a cache-accurate refresh
  countdown, a manual "Refresh now" button, a lifecycle chip, and an attempt count
  when a probe retried.
- **CSS cleanup**: removed dead legacy `.nav-bar`/`.nav-links`/`.sys-status`/
  `.site-footer`/`.footer-links`/`.footer-brand`/`.code-block` rules from
  `package-page.css`, dead decorative blocks from `css/common.css`, and dead
  inline rules from `404.html`.
- **Repo skills added** (`.agents/skills/`): `conxian-design-system`,
  `conxian-nav-and-search`, `conxian-status-truth`, `conxian-evidence-claims`.
- **Tests**: added `tests/nav-dropdown.spec.ts` (6 cases) and
  `tests/search-index.test.cjs` (3 cases, wired into `test:api`).
  Full suite: 45 Playwright + 38 Node, all green.
- **Docs**: AGENTS.md page inventory corrected to the actual 18 routes; dropdown,
  search, status, and skills behaviour documented.

## Main convergence review — 25 October 2026

The earlier October claims below are retained historical notes, not current
service, licensing, domain, provider or SLA acceptance. Ten dev commits were
found without an open promotion/reconciliation PR. The current candidate retains
that work and actual main history, including the managed-onboarding denial.
It qualifies static catalog and process-health metadata, corrects the blanket
MIT/staking/zkVM claims in README, and preserves every existing dev workflow byte.
Runtime/domain acceptance and the existing dev-to-main workflow delta require
their actual owning review; no production source or DNS change occurred.

## Strict Two-Tier Domain Topology & Master Research Alignment (2026-10-12)
- **Strict Two-Tier Domain Model**: Enforced strict two-tier domain separation across `DOMAIN_CUTOVER.md`, `server.js`, `README.md`, `research/index.html`, `docs/index.html`, and `search.js` separating `conxian.org` (Open-Source Protocol & Developer Distribution) and `conxian-labs.com` (Corporate & B2B Operations).
- **Master Research Prompt Enforcement**: Documented Zero-Token Policy (Bitcoin L1 anchor), Target A (`conxian-nexus` zkVM SP1/RISC Zero proving), Target B (`conxian-gateway` ISO 20022 translation & rate limiting), Target C (`conxius-enclave-sdk` Android StrongBox TEE KMS), and Target D (`conxius-platform` multi-tenant SLA deployment).
- **Search Engine Index Refinement**: Updated `search.js` keywords across `Home`, `Docs`, and `Research` to index `conxian.com` and governance hub terms.
- **Full Verification**: Ran complete Playwright verification suite across all 39 test cases (design compliance, search functionality, API health, and logging), achieving 100% pass rate with zero regressions.

## Org-Wide Research Expansion & CXIP-1317 Alignment (2026-10-07)
- **CXIP-1317 Proposal Integration**: Integrated Conxian Org-Wide Upgrade and Refinement Proposal (CXIP-1317) into `research/index.html` as an active governance and technical research pillar.
- **BaaP & Modular Core Architecture**: Detailed research domains across all 6 platform service pillars (`lib-conxian-core`, `conxian-gateway`, `conxian-nexus`, `conxian-market`, `conxian-business`, `conxius-wallet`) plus `conxius-enclave-sdk`.
- **Org-Wide Rules Execution**: Documented active enforcement of org and repository rules:
  - Complete purge and retirement of legacy monolith assets.
  - Domain Posture Compliance (`conxian.org` protocol vs `conxian-labs.com` corporate B2B).
  - Zero Secret Egress (ZSE) compile-time and CI scanning standards.
  - Multi-region Neon Serverless PostgreSQL and Supabase database topologies.
  - ISO 20022 messaging transformation for Bitcoin L1 / Stacks L2 settlement.
- **Search Engine Index Update**: Updated `search.js` to index CXIP-1317, BaaP, ZSE, ISO 20022, and related org-wide proposal search terms.

## Org-Wide Asset Purge & Active Modular Core Alignment (2026-09-12)
- **Deleted Asset Purge**: Purged all lingering references and deprecation notices for deleted legacy assets (`Conxian/Conxian` and `stackorbit`/`stacksorbit`) across `README.md`, `docs/index.html`, `research/index.html`, `commercial/index.html`, and `search.js`.
- **Active Modular Core Focus**: Refocused all site surfaces exclusively on the active modular stack (`lib-conxian-core`, `conxian-gateway`, `conxian-nexus`, `conxian-market`, and `conxian-business`).
- **Test Suite Realignment**: Updated Playwright test suites (`tests/comprehensive-verification.spec.ts` and `tests/search-functionality.spec.ts`) to verify active modular stack components instead of deleted legacy assets. All 39 Playwright tests passing.

## Recent Ecosystem Alignment & Research Evolution (2026-08-20)
- **Legacy Monolith Deprecation**: Formally deprecated `Conxian/Conxian` in favor of modular domain repositories (`conxian-market`, `conxian-gateway`, `conxian-nexus`). Updated `README.md`, `docs/index.html`, `commercial/index.html`, `research/index.html`, and `search.js`.
- **Market Surface Integration**: Registered `conxian-market` as the active execution and liquidity engine across public docs, commercial briefs, search index, and testing harnesses.
- **Research Expansion**: Expanded `research/index.html` with 6 active research domains:
  1. Logical Sovereignty (Zero-custody signing boundaries & TEE isolation)
  2. Market Protocols & Liquidity Mechanics (`conxian-market` order routing & proof & price oracles)
  3. Sovereign Database Topologies (Neon serverless Postgres & Supabase platform integration)
  4. Threshold Cryptography (MuSig2, FROST, Taproot Schnorr)
  5. Bitcoin L2 Settlement (Clarity smart contracts, Nakamoto consensus, BitVM proofs)
  6. Cross-Platform Enclaves (Android StrongBox TEE, Apple Secure Enclave, WASM)
- **Client-Side Search Enhancement**: Updated `search.js` to index `conxian-market` and reflect the deprecation status of legacy core components.

## Recent Fixes (2026-07-05)
- **Enterprise nav orphan fixed**: Added Enterprise to all page navigations (header + footer) across all 11 pages.
- **Enterprise page active state**: Fixed — own nav now correctly highlights Enterprise, not Research.
- **Deploy decoupled from test**: `render.yaml` `buildCommand` set to `npm install`.
- **AGENTS.md**: Updated with full development context.
- **Official Service Established**: Created `conxian-labs-site-official` (`srv-<redacted>`) on Render for canonical deployments.

## Org-Wide Service & Infrastructure Topology Audit (2026-08-27)
> **Correction (2026-11-03):** the Render service/workspace identifiers below were superseded. Current: `conxian-labs-site` = `srv-<redacted>`, workspace `Conxian-Business` = `tea-<redacted>`, URL `https://conxian-labs-site.onrender.com`. The historical values (`srv-<redacted>`, `tea-<redacted>`, `conxian-labs-site-xhqq.onrender.com`) no longer resolve.
- **Production Web Hosting (Render)**:
  - Active Primary Web Service: `conxian-labs-site` (`srv-<redacted>`), Oregon, Node.js runtime (`npm start`), workspace `Conxian-Business` (`tea-<redacted>`), live URL: `https://conxian-labs-site.onrender.com`.
  - Preview Web Service: `conxian-labs-site PR #64` (`srv-<redacted>`).
- **Neon Cloud Postgres Infrastructure** (Org `org-silent-sun-00457600`):
  1. `corelibs` (`sparkling-sunset-69236559`) — PG 18, `aws-us-east-2`.
  2. `Software dev kit` (`weathered-night-98492579`) — PG 18, `aws-us-east-2`.
  3. `Business Operating System` (`noisy-flower-17484435`) — PG 18, `aws-us-east-2`.
  4. `market` (`small-math-44741750`) — PG 18, `aws-eu-central-1`.
  5. `Gateway` (`noisy-cloud-41146057`) — PG 18, `aws-ap-southeast-1`.
  6. `Conxian Nexus` (`orange-paper-76209725`) — PG 17, `aws-eu-central-1`.
- **Site Core Architecture & Public Surfaces**:
  - Express.js dynamic web server (`server.js`) serving 15 clean public routes (`/`, `/sdk`, `/docs`, `/pricing`, `/partners`, `/operators`, `/enterprise`, `/research`, `/terms`, `/about`, `/security`, `/privacy`, `/commercial`, `/commercial/pilot`, `/404.html`).
  - Client-side zero-dependency search engine (`search.js`) indexing all 15 public surfaces.
  - Telemetry logging engine (`logger.js`) capturing route loads, terminal hash cycling, and client errors.
  - Institutional styling via `package-page.css` and shared CSS (`css/common.css`), enforcing "Ivory Foundation" palette (#FDFBF7 canvas, #121212 text, #C25E00 accent).

## Systemic API & Sitemap Upgrades (2026-08-27)
- **CI Fix (`server.js`)**: Defined `staticPages` array alias for `pageMetadata` to prevent runtime `ReferenceError` during `/api/site-map` dynamic evaluation.
- **Express Server Realignment (`server.js`)**:
  - Upgraded `/api/health` to serve uptime, process node version, environment, service name, and ecosystem database topology mapping.
  - Upgraded `/api/site-map` to dynamically serve descriptions, route priorities, and total surface counts across all 14 public routes.
- **XML Sitemap Standardization (`sitemap.xml`)**:
  - Reformatted XML structure with standard 2-space indentation, updated `<lastmod>` timestamps to 2026-08-27, and ensured uniform `<changefreq>` and `<priority>` fields.
- **Automated Verification Expansion (`tests/comprehensive-verification.spec.ts`)**:
  - Added Playwright test cases validating JSON schema and response data for `/api/health` and `/api/site-map`.
  - Added Playwright test case validating XML formatting and route coverage for `sitemap.xml`.
  - Executed full test suite: **39/39 Playwright tests passing**.

## Verification & Test Status
- **Playwright Test Suite**: All 39 tests passing across design compliance, comprehensive verification, logging, search, and commercial asset specs.

## Session Continuity & Evolution Strategy
- Each session executes an end-to-end cycle: audit context -> map gaps & score -> update code, docs & search -> verify with Playwright test suite -> track progress in `progress.md`.

## Master Reconnaissance & Architecture Review Completed (2026-09-15)
- **Strict Domain Separation Enforced**:
  - `conxian.org` (Protocol & Open-Source Surface): `nexus.conxian.org`, `gateway.conxian.org`, `sdk.conxian.org`, `platform.conxian.org`, `market.conxian.org`.
  - `conxian-labs.com` (Corporate & B2B Operations Surface): `bos.conxian-labs.com`, `www.conxian-labs.com`.
  - Updated `DOMAIN_CUTOVER.md`, `README.md`, and Express dynamic server API (`server.js` `/api/services`).
- **12-Repo Topology Baseline Established**: Indexed `lib-conxian-core`, `conxian-nexus`, `conxian-gateway`, `conxius-enclave-sdk`, `conxius-platform`, `conxian-market`, `conxian-business`, `conxius-wallet`, `conxian_ui`, `conxian-labs-site`, `conxius-docs`, and `conxian-infrastructure`.
- **Platform Dependency Review**: Mapped Rust primitive dependencies across core repos and verified pure Bitcoin L1 + ISO 20022 + Stacks L2 settlement posture.
- **B2B Deployment Simulation**: Defined end-to-end client journey, `.env` flags, ISO 20022 message transformation flow, and specified `conxian-cli` pre-flight validator.
- **Verification**: Executed 39/39 Playwright tests successfully.

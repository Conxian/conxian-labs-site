# Conxian Labs Site Remediation & Ecosystem Alignment Progress

## Recent Ecosystem Alignment & Research Evolution (2026-08-20)
- **Legacy Monolith Deprecation**: Formally deprecated `Conxian/Conxian` in favor of modular domain repositories (`conxian-market`, `conxian-gateway`, `conxian-nexus`). Updated `README.md`, `docs/index.html`, `commercial/index.html`, `research/index.html`, and `search.js`.
- **Market Surface Integration**: Registered `conxian-market` as the active execution and liquidity engine across public docs, commercial briefs, search index, and testing harnesses.
- **Research Expansion**: Expanded `research/index.html` with 6 active research domains:
  1. Logical Sovereignty (Zero-custody signing boundaries & TEE isolation)
  2. Market Protocols & Liquidity Mechanics (`conxian-market` order routing & risk oracles)
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
- **Official Service Established**: Created `conxian-labs-site-official` (`srv-d954bv8js32c73fd3lqg`) on Render for canonical deployments.

## Org-Wide Service & Infrastructure Topology Audit (2026-08-27)
- **Production Web Hosting (Render)**:
  - Active Primary Web Service: `conxian-labs-site` (`srv-d9ndhr2jnfac73as7te0`), Oregon (`us-west-1`), Node.js runtime (`npm start`), workspace `My Workspace` (`tea-d4ufhh8gjchc73c80mu0`), live URL: `https://conxian-labs-site-xhqq.onrender.com`.
  - Preview Web Service: `conxian-labs-site PR #64` (`srv-da82godbedkc73eqbsj0`).
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
- **Playwright Test Suite**: All 35+ tests passing across design compliance, comprehensive verification, logging, search, and commercial asset specs.

## Session Continuity & Evolution Strategy
- Each session executes an end-to-end cycle: audit context -> map gaps & score -> update code, docs & search -> verify with Playwright test suite -> track progress in `progress.md`.

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

## Render & Infrastructure Posture
- **Render Service**: `conxian-labs-site` (Node.js web service, `srv-d9ndhr2jnfac73as7te0`) in workspace `Conxian-Business` (`tea-d6u0edngi27c73dvhsg0`).
- **Neon Cloud Databases**: `corelibs`, `Software dev kit`, `Business Operating System`, `market`, `Gateway`, `Conxian Nexus`.
- **Supabase Projects**: `Conxian BOS` (`yauldfcpswnufgwfvnlr`) and `Conxian-platform` (`iczqutrbbfudfzfplymc`).

## Verification & Test Status
- **Playwright Test Suite**: All 35+ tests passing across design compliance, comprehensive verification, logging, search, and commercial asset specs.

## Session Continuity & Evolution Strategy
- Each session executes an end-to-end cycle: audit context -> map gaps & score -> update code, docs & search -> verify with Playwright test suite -> track progress in `progress.md`.

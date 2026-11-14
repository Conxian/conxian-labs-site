# Domain Cutover & Business-as-a-Platform (BaaP) Alignment Guide

## Current qualification — 25 October 2026

The routing tables and provider identifiers below are historical design references,
not executable cutover instructions or verified current service bindings. Live
Cloudflare records point the Labs apex and www hosts at Render (the `control` host
is a Cloudflare redirect to `bos`), while the
Labs Render origin is independently reachable. This conflicts with the intended
Labs-site placement below; Platform #1167 and Business #1349 own reconciliation.
Do not apply the historical Namecheap/Render DNS settings from this file without
verified ownership, source revision, authentication/state and rollback evidence.
No DNS or production deployment changes are included in this candidate.

## 1. Domain Topology & Strategic Narrative Distinction

To serve all services correctly from a **Business-as-a-Platform (BaaP)** operational perspective, the organization enforces a strict two-tier domain topology separating the **Open-Source Protocol / Dev Surface (`conxian.org`)** and the **Corporate / Operations Surface (`conxian-labs.com`)**:

*   **`conxian.org` (Protocol & Developer Distribution Surface)**:
    - **Identity**: Pure technology distribution, open-source protocol primitives, WASM/OCI registries, public governance identity, and developer documentation. No corporate marketing.
    - **Subdomain Routing Matrix**:
      - `nexus.conxian.org` -> `conxian-nexus` (Decentralized Proof & Price Oracle & Proof Synchronization)
      - `gateway.conxian.org` -> `conxian-gateway` (API Middleware, Fusion JWT/Enclave Auth & Sentinel Secret Filter)
      - `sdk.conxian.org` -> `conxius-enclave-sdk` (Cross-Platform Enclave Hardware Signing Abstraction)
      - `platform.conxian.org` -> `conxius-platform` (Platform Environment & Container Scaffolding)
      - `market.conxian.org` -> `conxian_market` (Nakamoto-Ready Settlement & Liquidity Engine)
*   **`conxian-labs.com` (Corporate & B2B Operations Surface)**:
    - **Identity**: Conxian Labs — Builder, Operator, Enterprise Solutions, B2B Sales, Legal, and Infrastructure Support.
    - **Subdomain Routing Matrix**:
      - `bos.conxian-labs.com` -> `conxian-business` (Business Operating System / BOS Execution Engine)
      - `www.conxian-labs.com` -> `conxian-labs-site` (Authoritative Public Site & Portfolio surface on Render)

---

## 2. Strict Service Routing Matrix

| Subdomain / Route | Target Repository | Domain Layer | Purpose |
| :--- | :--- | :--- | :--- |
| `nexus.conxian.org` | `conxian-nexus` | `conxian.org` | Decentralized Proof & Price Oracle & Proof Sync |
| `gateway.conxian.org` | `conxian-gateway` | `conxian.org` | Middleware API, Fusion Auth & Sentinel Filter |
| `sdk.conxian.org` | `conxius-enclave-sdk` | `conxian.org` | Hardware Enclave KMS & Signing SDK |
| `platform.conxian.org` | `conxius-platform` | `conxian.org` | Platform Scaffolding & Container Runner |
| `market.conxian.org` | `conxian_market` | `conxian.org` | Nakamoto Settlement Engine & Order Liquidity |
| `bos.conxian-labs.com` | `conxian-business` | `conxian-labs.com` | Business Operating System (BOS) Engine |
| `www.conxian-labs.com` | `conxian-labs-site` | `conxian-labs-site` | Authoritative Web Service (Render Node.js/Express) |

---

## 3. Cloudflare DNS Settings for `conxian-labs.com`

> **Correction (2026-11-03):** the settings below were superseded. Current live records: `conxian-labs.com` (apex) is a **proxied CNAME** to `conxian-labs-site.onrender.com` that redirects to `www`; `www` is a **proxied CNAME** to the same Render origin. `control.conxian-labs.com` is a proxied CNAME to `conxian-business.onrender.com` that 301-redirects to `bos`. The historical Vercel apex A-record (`76.76.21.21`), the `cname.vercel-dns.com` targets, and the `conxian-labs-site-xhqq.onrender.com` target no longer resolve.

### Root Domain: `conxian-labs.com`
*   **Type:** CNAME Record
*   **Host:** `@`
*   **Value:** `conxian-labs-site.onrender.com` (Render — apex redirect to `www`)
*   **Proxied:** Yes

### WWW Subdomain: `www.conxian-labs.com`
*   **Type:** CNAME Record
*   **Host:** `www`
*   **Value:** `conxian-labs-site.onrender.com`
*   **Proxied:** No

---

## 4. Render Instance & Infrastructure Configuration

### Service: `conxian-labs-site` (`srv-<redacted>`)
*   **Status**: Active Production Web Service (Node.js)
*   **Workspace**: `Conxian-Business` (`tea-<redacted>`)
*   **Region**: Oregon
*   **Build Command**: `npm install`
*   **Start Command**: `npm start`
*   **Auto-Deploy**: Enabled on `main` branch push.

---

## 5. Sub-service Infrastructure Mapping (Neon Postgres)

The active Neon organization (`neon-org-ref-redacted`; full identifiers retained privately in `.github-private/restricted/2026-11-14/`) hosts the following database projects supporting the BaaP infrastructure:
- **`corelibs`** (`neon-ref-redacted`, PG 18, `aws-us-east-2`)
- **`Software dev kit`** (`neon-ref-redacted`, PG 18, `aws-us-east-2`)
- **`Business Operating System`** (`neon-ref-redacted`, PG 18, `aws-us-east-2`)
- **`market`** (`neon-ref-redacted`, PG 18, `aws-eu-central-1`)
- **`Gateway`** (`neon-ref-redacted`, PG 18, `aws-ap-southeast-1`)
- **`Conxian Nexus`** (`neon-ref-redacted`, PG 17, `aws-eu-central-1`)

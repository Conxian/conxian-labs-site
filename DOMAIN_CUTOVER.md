# Domain Cutover & Business-as-a-Platform (BaaP) Alignment Guide

## 1. Domain Topology & Strategic Narrative Distinction

To serve all services correctly from a **Business-as-a-Platform (BaaP)** operational perspective, the organization enforces a strict legal and architectural firewall that separates the **Open-Source Protocol / Dev Surface (`conxian.org`)** from the **Corporate / Operations Surface (`conxian-labs.com`)**:

*   **`conxian.org` (Protocol & Developer Distribution Surface)**:
    - **Identity**: Pure technology distribution, open-source protocol primitives, WASM/OCI registries, and public identity. No corporate marketing.
    - **Subdomain Routing Matrix**:
      - `nexus.conxian.org` -> `conxian-nexus` (Decentralized Risk Oracle & Proof Synchronization)
      - `gateway.conxian.org` -> `conxian-gateway` (API Middleware, Fusion JWT/Enclave Auth & Sentinel Secret Filter)
      - `sdk.conxian.org` -> `conxius-enclave-sdk` (Cross-Platform Enclave Hardware Signing Abstraction)
      - `platform.conxian.org` -> `conxius-platform` (Platform Environment & Container Scaffolding)
      - `market.conxian.org` -> `conxian_market` (Nakamoto-Ready Settlement & Liquidity Engine)
*   **`conxian-labs.com` (Corporate, Governance, & B2B Operations Surface)**:
    - **Identity**: Conxian Labs — Builder, Operator, Enterprise Solutions, B2B Sales, Legal, and Infrastructure Support.
    - **Subdomain Routing Matrix**:
      - `bos.conxian-labs.com` -> `conxian-business` (Business Operating System / BOS Execution Engine)
      - `www.conxian-labs.com` -> `conxian-labs-site` (Authoritative Public Site & Portfolio surface on Render)

---

## 2. Strict Service Routing Matrix

| Subdomain / Route | Target Repository | Domain Layer | Purpose |
| :--- | :--- | :--- | :--- |
| `nexus.conxian.org` | `conxian-nexus` | `conxian.org` | Decentralized Risk Oracle & Proof Sync |
| `gateway.conxian.org` | `conxian-gateway` | `conxian.org` | Middleware API, Fusion Auth & Sentinel Filter |
| `sdk.conxian.org` | `conxius-enclave-sdk` | `conxian.org` | Hardware Enclave KMS & Signing SDK |
| `platform.conxian.org` | `conxius-platform` | `conxian.org` | Platform Scaffolding & Container Runner |
| `market.conxian.org` | `conxian_market` | `conxian.org` | Nakamoto Settlement Engine & Order Liquidity |
| `bos.conxian-labs.com` | `conxian-business` | `conxian-labs.com` | Business Operating System (BOS) Engine |
| `www.conxian-labs.com` | `conxian-labs-site` | `conxian-labs-site` | Authoritative Web Service (Render Node.js/Express) |

---

## 3. Namecheap DNS Settings for `conxian-labs.com`

To map `conxian-labs.com` to the live Render web service (`conxian-labs-site`):

### Root Domain: `conxian-labs.com`
*   **Type:** A Record
*   **Host:** `@`
*   **Value:** `216.24.57.1` (Render Anycast IP)
*   **TTL:** Automatic

### WWW Subdomain: `www.conxian-labs.com`
*   **Type:** CNAME Record
*   **Host:** `www`
*   **Value:** `conxian-labs-site-xhqq.onrender.com`
*   **TTL:** Automatic

---

## 4. Render Instance & Infrastructure Configuration

### Service: `conxian-labs-site` (`srv-d9ndhr2jnfac73as7te0`)
*   **Status**: Active Production Web Service (Node.js)
*   **Workspace**: `My Workspace` (`tea-d4ufhh8gjchc73c80mu0`)
*   **Region**: Oregon
*   **Build Command**: `npm install`
*   **Start Command**: `npm start`
*   **Auto-Deploy**: Enabled on `main` branch push.

---

## 5. Sub-service Infrastructure Mapping (Neon Postgres)

The active Neon organization (`org-silent-sun-00457600`) hosts the following database projects supporting the BaaP infrastructure:
- **`corelibs`** (`sparkling-sunset-69236559`, PG 18, `aws-us-east-2`)
- **`Software dev kit`** (`weathered-night-98492579`, PG 18, `aws-us-east-2`)
- **`Business Operating System`** (`noisy-flower-17484435`, PG 18, `aws-us-east-2`)
- **`market`** (`small-math-44741750`, PG 18, `aws-eu-central-1`)
- **`Gateway`** (`noisy-cloud-41146057`, PG 18, `aws-ap-southeast-1`)
- **`Conxian Nexus`** (`orange-paper-76209725`, PG 17, `aws-eu-central-1`)

# Domain Cutover & Business-as-a-Platform (BaaP) Alignment Guide

## 1. Domain Topology & Strategic Narrative Distinction

To serve all services correctly from a **Business-as-a-Platform (BaaP)** operational perspective, the organization enforces a strict domain topology that separates the **Protocol / Governance Layer** from the **Builder / Operator Layer**:

*   **`conxian.org` (Protocol & Ecosystem Governance Portal)**:
    - **Identity**: Sovereign Protocol, DAO Governance, BaaP Orchestration Hub, On-chain Settlement, and Public Identity.
    - **Routing Target**: Serves protocol specifications, DAO governance portals, ecosystem registry, and public discovery endpoints.
*   **`conxian-labs.com` (Builder & Operator Layer)**:
    - **Identity**: Conxian Labs — Builder, Operator, Enterprise Integrator, and Portfolio Host.
    - **Routing Target**: Serves institutional SDK distribution, commercial pilot onboarding, developer documentation, and active web services hosted on Render.

---

## 2. Business-as-a-Platform (BaaP) Service Routing Matrix

| Domain / Subdomain | Target Service / Host | Infrastructure Provider | Status & Purpose |
| :--- | :--- | :--- | :--- |
| `conxian.com` | Protocol Apex Router | DNS / Edge Gateway | Protocol & BaaP Governance Hub, DAO portal, apex routing |
| `conxian.org` | Ecosystem Portal | DNS / Edge Gateway | Ecosystem directory & public protocol hub |
| `www.conxian.com` | Ecosystem Entry | DNS / Edge Gateway | Public protocol & ecosystem landing |
| `conxian-labs.com` | `conxian-labs-site` | Render (`srv-d9ndhr2jnfac73as7te0`) | Apex redirect to `www.conxian-labs.com` |
| `www.conxian-labs.com` | `conxian-labs-site` | Render (`srv-d9ndhr2jnfac73as7te0`) | **Authoritative Live Web Service** (Node.js/Express) |
| `gateway.conxian-labs.com` | `Gateway` (`noisy-cloud-41146057`) | Neon PG 18 (ap-southeast-1) | Middleware & integration API (Planned/Private) |
| `vault.conxian-labs.com` | `Software dev kit` / KMS | Neon PG 18 (us-east-2) | Enclave KMS & Key Management (Planned/Private) |
| `nexus.conxian-labs.com` | `Conxian Nexus` (`orange-paper-76209725`)| Neon PG 17 (eu-central-1) | Proof & State Synchronization (Planned/Private) |

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

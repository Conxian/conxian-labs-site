# Domain Cutover & Infrastructure Enhancement Guide

## 1. Namecheap DNS Settings
To point your domains to the healthy Render instance (**conxian-labs-static-v1**), update your Namecheap DNS records as follows:

### Root Domain: conxian-labs.com
*   **Type:** A Record
*   **Host:** @
*   **Value:** 216.24.57.1 (Render's Anycast IP)
*   **TTL:** Automatic

### WWW Subdomain: www.conxian-labs.com
*   **Type:** CNAME Record
*   **Host:** www
*   **Value:** conxian-labs-static-v1.onrender.com
*   **TTL:** Automatic

---

## 2. Render Instance Enhancements

### Service: conxian-ui (srv-d7b0el3uibrs73b2qjg0)
*   **Status:** Critical Failure (Port Binding)
*   **Action Needed:**
    1.  Update the start command to remove the explicit `0.0.0.0:` prefix if using `serve`. Use `serve out -l $PORT` instead.
    2.  Upgrade Plan from **Free** to **Starter**. The Free plan spins down after inactivity, causing significant latency for institutional users.
    3.  Configure a Health Check Path (e.g., `/`) in the service settings to ensure Render monitors instance health correctly.

### Service: conxian-labs-static-v1 (srv-d8fmr7v40ujc73b7ba8g)
*   **Status:** Live & Healthy
*   **Enhancement:** I have applied hardened security headers and sub-page rewrites via `render.yaml`. Ensure "Auto-Deploy" is enabled (it currently is).

### Service: conxian-labs-site (srv-d8fmkcd8nd3s738pmbgg)
*   **Status:** Redundant / Build Failed
*   **Action Needed:** Delete this service to avoid confusion and redundant build attempts.

---

## 3. Sub-service Domains (Planned)
Once the above are stable, we recommend mapping these subdomains to their respective future services:
*   `gateway.conxian-labs.com`
*   `vault.conxian-labs.com`
*   `nexus.conxian-labs.com`

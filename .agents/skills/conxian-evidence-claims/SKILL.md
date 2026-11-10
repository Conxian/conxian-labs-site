---
name: conxian-evidence-claims
description: This skill should be used when writing or editing customer-facing copy, pricing, maturity labels, security claims, or any business statement on the Conxian Labs site.
---

# Evidence-grounded business claims

Conxian Labs is pre-revenue and the site is a proof-first surface. Copy must
state only what is evidenced, and must not invent numbers, SLAs, or entitlements.

## Doctrine

- **No invented figures.** If a rate, SLA, or uptime number is not backed by a
  configured, qualified capability, do not print it. Pricing tiers that cannot be
  delivered must render as `unavailable` / `reference-only`, never as purchasable.
- **Maturity labels are evidence-bounded.** The SDK is "Beta/conditional"; Market
  is "In development" and a library, not a runtime. Keep these consistent across
  pages (`tests/commercial-assets.spec.ts` asserts some of them).
- **Non-custodial boundary.** The company is not a custodian or fund manager.
  Wallet and signing copy must not imply custody.
- **Zero Secret Egress.** Never publish credentials, provider resource IDs,
  internal-only pricing strategy, or a bulk export of personal records in the
  repo or on any public page. Internal provider identifiers were redacted once
  (PR #185) — do not reintroduce them.
- **Reachability is not an SLA.** A green status dot does not establish
  entitlement, settlement, or custody. Say so where reachability is shown.
- **Domain split.** `conxian.org` = protocol/open-source surface;
  `conxian-labs.com` = corporate/B2B surface. Do not cross-link a customer path
  into an internal operator surface (e.g. the BOS control plane).

## Business vocabulary

- Conxian = protocol/infrastructure layer; Conxius = client/tooling layer.
- Bitcoin L1 rooted, no native Conxian token, no staking incentive.
- Commercial packaging doctrine (internal pricing strategy) is internal-only —
  never paste it into a public page.

## Before publishing copy

1. Does every number trace to a configured capability or a cited artifact?
2. Does any sentence promise an SLA, custody, or entitlement that is not
   evidenced?
3. Does it leak an internal identifier or secret?
4. Are maturity labels consistent with the page's neighbours and the tests?

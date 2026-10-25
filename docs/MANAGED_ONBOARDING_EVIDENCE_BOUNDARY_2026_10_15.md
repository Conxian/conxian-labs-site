# Managed onboarding evidence boundary

Tracks Labs Site #80, Market #159 and Business #1343/#1390. Existing monthly and per-operation numbers are preserved as design references. The API declares reference-only pricing, unavailable service, and no qualified endpoint, checkout or subscription payment pointer. A valid signup returns HTTP 503 with `subscription_unavailable`; existing malformed tier/email errors remain HTTP 400.

An environment checkout URL alone cannot qualify payment, entitlement verification, provisioning or a managed service. This candidate therefore publishes no payment demand and collects no subscription. Enablement requires independently verified provider/payment contracts, a nonzero resolved payment demand where applicable, authenticated webhook/entitlement verification, idempotent key lifecycle/provisioning and runtime/recovery evidence. Existing static pricing and health routes remain available.

Six HTTP tests cover reference pricing, configured and missing checkout, valid-but-unavailable signup, validation errors and existing routes/security headers. CI runs them on dev/staged/main PRs; this change does not deploy the service or settle portfolio pricing decisions.

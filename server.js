const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self';");
  next();
});

// Product subdomains are all served by this one site host (see the Cloudflare
// `conxian-proxy` Worker). Landing every one of them on the same homepage
// presents four products as one undifferentiated surface, so route each host
// to its own product page. The Worker forwards the original host in
// X-Forwarded-Host; direct Render access has no such header and keeps the
// homepage.
const HOST_LANDING_ROUTES = {
  "sdk.conxian.org": "/sdk",
  "market.conxian.org": "/commercial",
  "wallet.conxian.org": "/enterprise",
  "docs.conxian.org": "/docs",
};

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path !== "/" && req.path !== "/index.html") return next();
  const forwarded = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const target = HOST_LANDING_ROUTES[forwarded];
  if (!target) return next();
  res.redirect(302, target);
});

const pageMetadata = [
  { route: "", title: "Home", desc: "Proof-first software stack for the Conxian ecosystem", priority: 1.0 },
  { route: "sdk", title: "SDK — Conxius Enclave SDK", desc: "Cross-platform enclave and key-management boundaries", priority: 0.9 },
  { route: "docs", title: "Docs — Documentation", desc: "Technical documentation for the Conxian ecosystem", priority: 0.8 },
  { route: "pricing", title: "Pricing & Packaging", desc: "Commercial packaging and plan matrix", priority: 0.7 },
  { route: "get-started", title: "Get Started", desc: "Self-serve customer journey from sign-up to running service", priority: 0.9 },
  { route: "console", title: "Console", desc: "Provision, manage, and cancel Conxian services", priority: 0.9 },
  { route: 'commercial', title: "Commercial Brief", desc: "Executive buyer brief and ecosystem readiness", priority: 0.8 },
  { route: 'commercial/pilot', title: "Scoped Pilot Brief", desc: "Bounded pilot narrative and evaluation criteria", priority: 0.8 },
  { route: "partners", title: "Partners", desc: "Ecosystem partners and collaborative initiatives", priority: 0.6 },
  { route: "operators", title: "Operators", desc: "Node operators and infrastructure providers", priority: 0.6 },
  { route: "bos", title: "BOS — Business Operating System", desc: "Public-safe operating model, knowledge graph, and framework", priority: 0.7 },
  { route: "enterprise", title: "Enterprise", desc: "Institutional deployment discovery and governance", priority: 0.6 },
  { route: "research", title: "Research", desc: "Research surfaces and cryptographic papers", priority: 0.6 },
  { route: "about", title: "About — Conxian Labs", desc: "Builder and operator layer around Conxian", priority: 0.5 },
  { route: "security", title: "Security — Conxian Labs", desc: "Security posture and vulnerability disclosure", priority: 0.5 },
  { route: "status", title: "Status — Conxian Labs", desc: "Live reachability of the public Conxian service surfaces", priority: 0.6 },
  { route: "privacy", title: "Privacy Policy", desc: "Data protection and privacy commitments", priority: 0.3 },
  { route: "terms", title: "Terms of Service", desc: "Legal terms governing infrastructure use", priority: 0.3 }
];

const staticPages = pageMetadata.map(p => p.route);

for (const p of pageMetadata) {
  const indexPath = path.join(__dirname, p.route, "index.html");
  if (fs.existsSync(indexPath)) {
    app.get(`/${p.route}`, (req, res) => {
      res.sendFile(indexPath);
    });
  }
}

app.use(express.static(path.join(__dirname), {
  index: false,
  dotfiles: "deny",
}));

// Dynamic API endpoints
// Live service registry. Each entry is probed at request time so the public
// catalog reflects real reachability rather than a static declaration. Only
// public HTTPS hosts are probed; results are cached briefly to bound egress.
const SERVICE_REGISTRY = [
  { id: "bos", name: "Business Operating System (BOS)", role: "State orchestration & governance", host: "bos.conxian-labs.com", probe: "https://bos.conxian-labs.com/api/health", expect: [200], identity: "conxian-business", route: "/bos" },
  { id: "gateway", name: "Gateway (Fusion & Sentinel)", role: "Middleware & access control", host: "gateway.conxian.org", probe: "https://gateway.conxian.org/api/v1/health", expect: [200], identity: "conxian-gateway", route: "/docs" },
  { id: "nexus", name: "Conxian Nexus Proof & Price Oracle", role: "Proof & oracle layer", host: "nexus.conxian.org", probe: "https://nexus.conxian.org/health", expect: [200], identity: "conxian-nexus", route: "/research" },
];

// Published packages (market, enclave-sdk, corelibs) are libraries, not
// independently-run runtimes: they ship to registries and are consumed by the
// deployed services, so there is no separate host to probe. Their liveness is
// implied by the site being up. They are documented as libraries in
// /api/services rather than presented here as uptime targets.
//
// Any future surface that shares the public site host is still detected at
// request time (see classifyProbe) and shown honestly as an alias, so a shared
// host is never presented as an independently verified service.
const ALIAS_REGISTRY = [];

const PROBE_CACHE_MS = 30000;
const PROBE_TIMEOUT_MS = 12000;
const SITE_IDENTITY = "conxian-labs-site";
// Commissioning is an explicit operational decision, not inferred from a DNS
// record or a successful HTTP response. No service is assumed production by
// default. Set STATUS_PRODUCTION_SERVICES to comma-separated known IDs only
// after owner-approved, evidenced end-to-end qualification.
function productionServiceIds() {
  const candidates = new Set(SERVICE_REGISTRY.map(s => s.id));
  return new Set(String(process.env.STATUS_PRODUCTION_SERVICES || "")
    .split(",").map(v => v.trim()).filter(id => candidates.has(id)));
}
let probeCache = { at: 0, results: null, productionKey: "" };

function classifyProbe(service, httpStatus, detail) {
  const reachable = service.expect.includes(httpStatus);
  const servedService = detail && typeof detail.service === "string" ? detail.service : null;
  const servedBySite = servedService === SITE_IDENTITY;
  const alias = reachable && (servedBySite || ALIAS_REGISTRY.some(s => s.id === service.id));
  const safetyMode = Boolean(detail && (detail.safety_mode === true ||
    detail.status === "safety-mode" || detail.status === "safety_mode"));
  const identityMatches = servedService === service.identity;
  const verified = reachable && identityMatches && !alias && !safetyMode;
  const state = alias ? "alias" : !reachable ? "unreachable" :
    !identityMatches ? "unverified" : safetyMode ? "degraded" : "operational";
  return { alias, verified, reachable, safetyMode, servedService, identityMatches, state };
}

async function probeService(service) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(service.probe, {
      method: "GET", signal: controller.signal, redirect: "manual",
    });
    const latencyMs = Date.now() - started;
    let detail = null;
    try {
      const responseText = (await response.text()).slice(0, 600);
      if (responseText.trim().startsWith("{")) detail = JSON.parse(responseText);
    } catch { detail = null; }
    const classification = classifyProbe(service, response.status, detail);
    return {
      ...service, ...classification, httpStatus: response.status, latencyMs,
      detail, checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...service, ...classifyProbe(service, null, null), httpStatus: null,
      latencyMs: Date.now() - started,
      detail: { error: String(error && error.name ? error.name : error) },
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function serviceSnapshot() {
  const now = Date.now();
  const production = productionServiceIds();
  const productionKey = [...production].sort().join(",");
  if (probeCache.results && now - probeCache.at < PROBE_CACHE_MS
    && probeCache.productionKey === productionKey) {
    return { ...probeCache.results, cached: true };
  }
  const results = await Promise.all(
    [...SERVICE_REGISTRY, ...ALIAS_REGISTRY].map(s => probeService(s)),
  );
  const commissioned = results.filter(r => production.has(r.id));
  const unhealthy = commissioned.filter(r => r.state !== "operational");
  const unreachable = commissioned.filter(r => r.state === "unreachable");
  const overall = commissioned.length === 0 ? "unverified" :
    unhealthy.length === 0 ? "operational" :
    unreachable.length === commissioned.length ? "major-outage" : "partial-outage";
  const total = results.length;
  const snapshot = {
    generatedAt: new Date().toISOString(),
    total,
    reachable: results.filter(r => r.reachable).length,
    verified: results.filter(r => r.verified).length,
    aliases: results.filter(r => r.alias).length,
    down: results.filter(r => !r.reachable).length,
    degraded: results.filter(r => r.state !== "operational").length,
    overall,
    production: {
      commissioned: commissioned.length,
      operational: commissioned.filter(r => r.state === "operational").length,
      degraded: commissioned.filter(r => r.state === "degraded").length,
      unreachable: unreachable.length,
      unverified: commissioned.filter(r => r.state === "unverified").length,
    },
    services: results.map(({ probe, expect, identity, ...rest }) => ({
      ...rest,
      lifecycle: production.has(rest.id) ? "production" : "uncommissioned",
    })),
    cached: false,
  };
  probeCache = { at: now, results: snapshot, productionKey };
  return snapshot;
}

app.get("/api/status", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.json(await serviceSnapshot());
  } catch (error) {
    res.status(500).json({ error: "status-probe-failed", detail: String(error) });
  }
});

app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: "healthy",
    scope: "web-process",
    dependenciesVerified: false,
    service: "conxian-labs-site",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: require("./package.json").version,
    node: process.version,
    infrastructure: {
      status: "unverified",
      provider: "Render",
      databases: ["corelibs", "Software dev kit", "Business Operating System", "market", "Gateway", "Conxian Nexus"]
    }
  });
});

app.get("/api/services", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    platform: "Conxian Business-as-a-Platform (BaaP)",
    status: "unverified",
    scope: "reference-catalog",
    productionSupported: false,
    routingStatus: "intended-unverified",
    domains: {
      protocol: "conxian.org",
      corporate: "conxian-labs.com"
    },
    routingMatrix: {
      "conxian-nexus": "nexus.conxian.org",
      "conxian-gateway": "gateway.conxian.org",
      "conxius-enclave-sdk": "sdk.conxian.org",
      "conxius-platform": "platform.conxian.org",
      "conxian_market": "market.conxian.org",
      "conxian-business": "bos.conxian-labs.com",
      "conxian-labs-site": "www.conxian-labs.com"
    },
    services: [
      { id: "bos", name: "Business Operating System (BOS)", type: "State Orchestration & Governance", status: "active", host: "bos.conxian-labs.com", route: "/bos" },
      { id: "nexus", name: "Conxian Nexus Proof & Price Oracle", type: "Decentralized Proof & Oracle Layer", status: "active", host: "nexus.conxian.org", route: "/research" },
      { id: "gateway", name: "Gateway (Fusion & Sentinel)", type: "Middleware & Access Control", status: "active", host: "gateway.conxian.org", route: "/docs" },
      { id: "market", name: "Conxian Market Settlement Engine", type: "Nakamoto-Ready Liquidity Engine", status: "library", host: "market.conxian.org", route: "/commercial" },
      { id: "sdk", name: "Conxius Enclave SDK", type: "Cross-Platform Hardware Signing Abstraction", status: "library", host: "sdk.conxian.org", route: "/sdk" },
      { id: "corelibs", name: "Corelibs Cryptographic Library", type: "Shared Protocol Cryptographic Primitives", status: "library", host: "docs.conxian.org", route: "/docs" }
    ].map(service => ({ ...service, productionSupported: false })),
    infrastructureTopology: {
      status: "historical-reference",
      verified: false,
      renderHost: "conxian-labs-site (srv-db9l01fbtjjs73c4e2vg)",
      neonDatabases: ["corelibs", "Software dev kit", "Business Operating System", "market", "Gateway", "Conxian Nexus"],
      supabaseProjects: ["Conxian BOS (yauldfcpswnufgwfvnlr)", "Conxian-platform (iczqutrbbfudfzfplymc)"]
    }
  });
});

app.get("/api/site-map", (req, res) => {
  const routes = pageMetadata.map(p => ({
    route: `/${p.route}`,
    title: p.title,
    description: p.desc,
    priority: p.priority
  }));
  res.json({ routes, total: routes.length });
});

// Managed pricing stays a design reference until this deployment can both take
// payment and deliver the service. A Merchant-of-Record checkout URL alone is
// not a qualified offer, so the tier is available only when a hosted checkout
// (Lemon Squeezy / Paddle) AND the managed gateway delivery endpoint are both
// configured; otherwise the tier remains unavailable. Values are read at request
// time so a redeploy that changes the configuration takes effect.
function configuredUrl(name) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

const MANAGED_TIER = {
  id: "managed",
  name: "Managed SaaS Gateway",
  schemaVersion: 1,
  monthlyUsd: 200,
  perRelayMessageUsd: 0.01,
  perRwaVerificationUsd: 0.05,
  perSettlementOpUsd: 0.1,
};

function managedTierView() {
  const checkoutUrl = configuredUrl("MERCHANT_CHECKOUT_URL");
  const endpoint = configuredUrl("MANAGED_GATEWAY_ENDPOINT");
  const available = checkoutUrl !== null && endpoint !== null;
  return {
    ...MANAGED_TIER,
    pricingStatus: available ? "live" : "reference-only",
    availability: available ? "available" : "unavailable",
    productionSupported: available,
    endpoint: available ? endpoint : null,
    features: available
      ? ["managed-gateway-endpoint", "metered-relay", "rwa-verification", "settlement-ops"]
      : [],
    checkoutUrl: available ? checkoutUrl : null,
    x402PaymentPointer: null,
    qualificationRequired: available ? ["payment", "entitlement"] : ["payment", "entitlement", "runtime-provisioning"],
  };
}

app.get("/api/pricing/managed", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(managedTierView());
});

app.post("/api/onboarding/subscribe", (req, res) => {
  const { tier, email } = req.body || {};
  if (tier !== "managed") {
    return res.status(400).json({ error: "Unsupported tier", code: "unsupported_tier" });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required", code: "invalid_email" });
  }

  res.setHeader("Cache-Control", "no-store");
  const view = managedTierView();
  if (!view.productionSupported) {
    return res.status(503).json({
      error: "Managed subscriptions are not available",
      code: "subscription_unavailable",
      tier: MANAGED_TIER.id,
      availability: "unavailable",
      checkoutUrl: null,
      x402Demand: null,
      next: "Contact the commercial team for a scoped evaluation",
    });
  }

  // Hand the buyer off to the Merchant-of-Record hosted checkout. This returns a
  // checkout target only; it never reports a completed purchase, entitlement or
  // provisioned key — those are minted by the gateway webhook after settlement.
  return res.status(200).json({
    tier: MANAGED_TIER.id,
    availability: "available",
    checkoutUrl: view.checkoutUrl,
    entitlement: "pending-checkout",
    next: "Complete checkout; your managed API key is issued after payment settles",
  });
});

// Gated access-request intake. Public self-serve sign-up is not enabled, so the
// site captures a request and routes it to a restricted intake system (never
// Git). The endpoint fails closed: it reports `received: true` only after the
// configured intake accepts the record, and otherwise returns a mailto fallback
// rather than implying a request was stored. The payload is never persisted in
// this process and is not written to logs.
const ACCESS_REQUEST_FALLBACK = "mailto:labs@conxian-labs.com?subject=Console%20access%20request";

function boundedField(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

app.post("/api/onboarding/request-access", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const email = boundedField((req.body || {}).email, 254);
  const organization = boundedField((req.body || {}).organization, 120);
  const need = boundedField((req.body || {}).need, 500);

  if (!email || !email.includes("@") || email.length > 254) {
    return res.status(400).json({ error: "A valid email is required", code: "invalid_email" });
  }

  const intakeUrl = configuredUrl("ACCESS_REQUEST_ENDPOINT");
  if (intakeUrl === null) {
    return res.status(503).json({
      received: false,
      code: "intake_not_configured",
      fallbackUrl: ACCESS_REQUEST_FALLBACK,
      next: "Email the team; online intake is not configured on this deployment",
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let accepted = false;
    try {
      const response = await fetch(intakeUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, organization, need, source: "conxian-labs-site" }),
        redirect: "manual",
        signal: controller.signal,
      });
      accepted = response.status >= 200 && response.status < 300;
    } finally {
      clearTimeout(timer);
    }
    if (!accepted) {
      return res.status(502).json({
        received: false,
        code: "intake_failed",
        fallbackUrl: ACCESS_REQUEST_FALLBACK,
        next: "Email the team; the intake system did not accept the request",
      });
    }
    return res.status(200).json({
      received: true,
      message: "Request received. The team will reply by email.",
    });
  } catch (error) {
    return res.status(502).json({
      received: false,
      code: "intake_failed",
      fallbackUrl: ACCESS_REQUEST_FALLBACK,
      next: "Email the team; the intake system could not be reached",
    });
  }
});

// SPA-style fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Conxian-Labs dynamic server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;

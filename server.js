const express = require("express");
const compression = require("compression");
const { rateLimit } = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Behind the Cloudflare Worker proxy, so use the real client IP from the
// forwarded chain for rate-limit keying. `1` trusts exactly the one proxy hop.
app.set("trust proxy", 1);

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

// The pricing page carries Service + Offer JSON-LD generated from the live
// service catalogue (managedTierView), so the structured data cannot drift from
// /api/pricing/managed. Registered before the generic static loop so it wins.
// The template is read once at startup: the file is immutable for the process
// lifetime, so a per-request disk read only adds unbounded I/O under load.
const PRICING_INDEX_PATH = path.join(__dirname, "pricing", "index.html");
const PRICING_PAGE_TEMPLATE = fs.existsSync(PRICING_INDEX_PATH)
  ? fs.readFileSync(PRICING_INDEX_PATH, "utf8")
  : null;

if (PRICING_PAGE_TEMPLATE !== null) {
  app.get("/pricing", (req, res) => {
    res.type("html").send(withPricingJsonLd(PRICING_PAGE_TEMPLATE));
  });
}

// Managed Service + Offer JSON-LD remains confined to /pricing until the
// pricing, legal, operational and independent acceptance gates are complete.

for (const p of pageMetadata) {
  const indexPath = path.join(__dirname, p.route, "index.html");
  if (fs.existsSync(indexPath)) {
    app.get(`/${p.route}`, (req, res) => {
      res.sendFile(indexPath);
    });
  }
}

// Machine-readable discovery files for autonomous agents. Served explicitly
// because express.static denies dotfiles (.well-known) and these must be
// readable at stable, spec-defined paths.
app.get("/llms.txt", (req, res) => {
  res.type("text/plain").sendFile(path.join(__dirname, "llms.txt"));
});

app.get("/.well-known/security.txt", (req, res) => {
  res.type("text/plain").sendFile(path.join(__dirname, ".well-known", "security.txt"), { dotfiles: "allow" });
});

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
// Render free instances spin down when idle and pay a cold start on the next
// request, which can exceed any single tight timeout. Probing once with a short
// timeout reported healthy-but-cold runtimes as "unreachable" and produced
// false major-outage banners. Retry within a bounded budget instead, so
// "unreachable" only means the runtime stayed unresponsive after every attempt.
//
// Warming the three services permanently is not an option: Render grants 750
// free instance-hours per workspace per month, while three always-on services
// would need roughly 2,160. So the fix belongs in how we probe and report.
const PROBE_ATTEMPTS = 3;
const PROBE_ATTEMPT_TIMEOUT_MS = 18000;
const PROBE_BACKOFF_MS = 500;
const PROBE_TOTAL_BUDGET_MS = 60000;
const SITE_IDENTITY = "conxian-labs-site";

// Optional overrides let operators tune the budget per environment, and let the
// regression tests exercise retry behaviour without waiting on real timeouts.
function probeLimits() {
  const positive = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    attempts: Math.floor(positive(process.env.STATUS_PROBE_ATTEMPTS, PROBE_ATTEMPTS)),
    attemptTimeoutMs: positive(process.env.STATUS_PROBE_ATTEMPT_TIMEOUT_MS, PROBE_ATTEMPT_TIMEOUT_MS),
    backoffMs: positive(process.env.STATUS_PROBE_BACKOFF_MS, PROBE_BACKOFF_MS),
    totalBudgetMs: positive(process.env.STATUS_PROBE_TOTAL_BUDGET_MS, PROBE_TOTAL_BUDGET_MS),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
let probeInFlight = null;

function classifyProbe(service, httpStatus, detail) {
  // A 429 is an answer from a live edge: DNS resolved, TLS completed and the
  // application edge replied. The runtime is alive and merely throttling the
  // caller, so folding it into "unreachable" reported a false major outage
  // whenever the prober itself was rate limited. Kept distinct from an expected
  // 2xx, which is the only status that can prove a verified service.
  const rateLimited = httpStatus === 429;
  const reachable = service.expect.includes(httpStatus) || rateLimited;
  const servedService = detail && typeof detail.service === "string" ? detail.service : null;
  const servedBySite = servedService === SITE_IDENTITY;
  const alias = reachable && !rateLimited && (servedBySite || ALIAS_REGISTRY.some(s => s.id === service.id));
  const safetyMode = Boolean(detail && (detail.safety_mode === true ||
    detail.status === "safety-mode" || detail.status === "safety_mode"));
  const identityMatches = servedService === service.identity;
  const verified = reachable && !rateLimited && identityMatches && !alias && !safetyMode;
  const state = alias ? "alias" : rateLimited ? "rate-limited" : !reachable ? "unreachable" :
    !identityMatches ? "unverified" : safetyMode ? "degraded" : "operational";
  return { alias, verified, reachable, rateLimited, safetyMode, servedService, identityMatches, state };
}

async function probeOnce(service, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
    return {
      response, detail, latencyMs,
      classification: classifyProbe(service, response.status, detail),
    };
  } finally {
    clearTimeout(timer);
  }
}

// A probe result is kept only when the runtime actually answered. An HTTP error
// status still counts as an answer (classified honestly as unreachable or
// unverified); only a transport failure or timeout is retried, because that is
// the signature of a cold free-tier instance.
async function probeService(service) {
  const limits = probeLimits();
  const started = Date.now();
  let lastError = null;
  let attempts = 0;

  while (attempts < limits.attempts) {
    const elapsed = Date.now() - started;
    if (attempts > 0 && elapsed + limits.attemptTimeoutMs > limits.totalBudgetMs) break;
    attempts += 1;
    try {
      const { response, detail, latencyMs, classification } = await probeOnce(service, limits.attemptTimeoutMs);
      return {
        ...service, ...classification, httpStatus: response.status, latencyMs,
        detail, attempts, coldStart: attempts > 1, checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      if (attempts < limits.attempts) await sleep(limits.backoffMs);
    }
  }

  return {
    ...service, ...classifyProbe(service, null, null), httpStatus: null,
    latencyMs: Date.now() - started, attempts, coldStart: false,
    detail: { error: String(lastError && lastError.name ? lastError.name : lastError) },
    checkedAt: new Date().toISOString(),
  };
}

async function serviceSnapshot() {
  const now = Date.now();
  const production = productionServiceIds();
  const productionKey = [...production].sort().join(",");
  if (probeCache.results && now - probeCache.at < PROBE_CACHE_MS
    && probeCache.productionKey === productionKey) {
    return { ...probeCache.results, cached: true };
  }
  // Coalesce concurrent callers onto one probe sweep. Without this, a burst of
  // requests after a cache expiry would each wake the free-tier runtimes.
  if (probeInFlight && probeInFlight.productionKey === productionKey) {
    return probeInFlight.promise;
  }
  const promise = (async () => {
    const results = await Promise.all(
      [...SERVICE_REGISTRY, ...ALIAS_REGISTRY].map(s => probeService(s)),
    );
    return buildSnapshot(results, production, productionKey);
  })().finally(() => { probeInFlight = null; });
  probeInFlight = { productionKey, promise };
  return promise;
}

function buildSnapshot(results, production, productionKey) {
  const commissioned = results.filter(r => production.has(r.id));
  // Rate limiting is not an outage: the edge answered and proved the runtime is
  // alive, so it must not drive the banner red the way a genuine failure does.
  const unhealthy = commissioned.filter(r => r.state !== "operational" && r.state !== "rate-limited");
  const unreachable = commissioned.filter(r => r.state === "unreachable");
  const rateLimited = commissioned.filter(r => r.state === "rate-limited");
  const overall = commissioned.length === 0 ? "unverified" :
    unhealthy.length === 0 ? "operational" :
    unreachable.length === commissioned.length ? "major-outage" : "partial-outage";
  const total = results.length;
  const limits = probeLimits();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    total,
    reachable: results.filter(r => r.reachable).length,
    verified: results.filter(r => r.verified).length,
    aliases: results.filter(r => r.alias).length,
    down: results.filter(r => !r.reachable).length,
    degraded: results.filter(r => r.state !== "operational").length,
    // Services that only answered after a retry were cold, not down. Reported
    // separately so a slow free-tier wake-up is never read as an outage.
    coldStarts: results.filter(r => r.coldStart).length,
    // Throttled callers are disclosed so an observer-triggered rate limit is
    // never mistaken for a service fault.
    rateLimited: results.filter(r => r.rateLimited).length,
    probe: {
      attempts: limits.attempts,
      attemptTimeoutMs: limits.attemptTimeoutMs,
      totalBudgetMs: limits.totalBudgetMs,
    },
    // Snapshot cache lifetime, disclosed so the status page can show how fresh
    // the reading is and time its refresh to the actual cache boundary rather
    // than polling blindly.
    cacheTtlMs: PROBE_CACHE_MS,
    overall,
    production: {
      commissioned: commissioned.length,
      operational: commissioned.filter(r => r.state === "operational").length,
      degraded: commissioned.filter(r => r.state === "degraded").length,
      unreachable: unreachable.length,
      unverified: commissioned.filter(r => r.state === "unverified").length,
      rateLimited: rateLimited.length,
    },
    services: results.map(({ probe, expect, identity, ...rest }) => ({
      ...rest,
      lifecycle: production.has(rest.id) ? "production" : "uncommissioned",
    })),
    cached: false,
  };
  probeCache = { at: Date.now(), results: snapshot, productionKey };
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
    // Internal topology is summarised by ROLE only. Provider resource
    // identifiers (Render service/workspace ids, database project refs) are
    // not published: they are internal identifiers per
    // conxian-business docs/DATA_CLASSIFICATION_GUARDRAILS.md. See
    // conxian-business#1817.
    infrastructureTopology: {
      status: "historical-reference",
      verified: false,
      renderHost: "conxian-labs-site",
      neonDatabases: ["corelibs", "Software dev kit", "Business Operating System", "market", "Gateway", "Conxian Nexus"],
      supabaseProjects: ["Conxian BOS", "Conxian-platform"]
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
// payment and deliver the service. Per ADR-009 the gateway is the single
// monetization surface and the Lightning subscription rail is the sanctioned
// crypto-native path (no card-network Merchant of Record: their acceptable-use
// policies forbid this product). The tier is available only when the gateway's
// billing base URL is configured AND the delivery endpoint is configured;
// otherwise it remains unavailable. Values are read at request time so a
// redeploy that changes the configuration takes effect.
function configuredUrl(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function configuredPublicHttpsUrl(name) {
  const candidate = configuredUrl(name);
  if (candidate === null) return null;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const reservedHost = hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "invalid"
    || hostname.endsWith(".invalid")
    || hostname === "test"
    || hostname.endsWith(".test")
    || hostname === "example"
    || hostname.endsWith(".example")
    || ["example.com", "example.net", "example.org"].includes(hostname);

  // Managed-tier values cross a browser redirect and a provisioning trust
  // boundary. Keep private intake configuration independent from this public
  // checkout constraint.
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || reservedHost) {
    return null;
  }
  return candidate;
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

// Plans the gateway's Lightning rail accepts (sats/month). Mirrors the gateway
// billing engine so the site cannot offer a plan the gateway rejects.
const MANAGED_PLANS = {
  starter: 0,
  indie: 37700,
  business: 128000,
  enterprise: 1000000,
};

// The gateway billing base, e.g. https://gateway.conxian.org. Validated as a
// public HTTPS URL (it crosses a provisioning trust boundary) so a typo cannot
// point the site at a non-TLS or placeholder host. Unset or invalid = no rail.
function billingBase() {
  return configuredPublicHttpsUrl("MANAGED_BILLING_BASE_URL");
}

function managedTierView() {
  const base = configuredPublicHttpsUrl("MANAGED_BILLING_BASE_URL");
  const endpoint = configuredPublicHttpsUrl("MANAGED_GATEWAY_ENDPOINT");
  const available = base !== null && endpoint !== null;
  return {
    ...MANAGED_TIER,
    pricingStatus: available ? "live" : "reference-only",
    availability: available ? "available" : "unavailable",
    productionSupported: available,
    endpoint: available ? endpoint : null,
    features: available
      ? ["managed-gateway-endpoint", "metered-relay", "rwa-verification", "settlement-ops"]
      : [],
    // The checkout is the gateway's Lightning invoice rail, not a hosted MoR
    // URL. No static checkout URL is advertised; the invoice is created per
    // request and is single-use.
    checkoutUrl: null,
    paymentRail: available ? "lightning" : null,
    plans: available ? Object.keys(MANAGED_PLANS) : [],
    x402PaymentPointer: null,
    qualificationRequired: available ? ["payment", "entitlement"] : ["payment", "entitlement", "runtime-provisioning"],
  };
}

// Schema.org Service + Offer for the pricing page. The offer is derived from
// managedTierView() so the structured data always matches the API descriptor:
// availability maps to schema.org ItemAvailability. No BuyAction is emitted: the
// Lightning invoice is created per request, so there is no static checkout URL to
// advertise (and a purchase that is not available is never advertised).
function pricingJsonLd() {
  const tier = managedTierView();
  const offer = {
    "@type": "Offer",
    name: tier.name,
    price: String(tier.monthlyUsd),
    priceCurrency: "USD",
    availability: tier.productionSupported
      ? "https://schema.org/InStock"
      : "https://schema.org/PreOrder",
    url: "https://www.conxian-labs.com/pricing",
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.conxian-labs.com/#organization",
        name: "Conxian Labs",
        url: "https://www.conxian-labs.com/",
        logo: "https://www.conxian-labs.com/Conxian-Labs_Logo.jpg",
      },
      {
        "@type": "Service",
        name: "Conxian Labs managed infrastructure",
        serviceType: "Bitcoin-native cloud infrastructure",
        provider: { "@id": "https://www.conxian-labs.com/#organization" },
        areaServed: "Global",
        url: "https://www.conxian-labs.com/pricing",
        offers: offer,
      },
    ],
  };
}

const PRICING_JSONLD_MARKER = "<!-- service-jsonld -->";

function withPricingJsonLd(html) {
  if (html.includes(PRICING_JSONLD_MARKER)) return html;
  const script = `${PRICING_JSONLD_MARKER}\n    <script type="application/ld+json">\n${JSON.stringify(pricingJsonLd(), null, 2)}\n    </script>\n`;
  return html.replace("</head>", `${script}</head>`);
}

app.get("/api/pricing/managed", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(managedTierView());
});

// The onboarding endpoints do outbound work (subscription/intake), so cap the
// per-IP request rate to bound abuse and accidental hammering.
const onboardingLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests", code: "rate_limited" },
});

app.post("/api/onboarding/subscribe", onboardingLimiter, async (req, res) => {
  const { tier, plan, email } = req.body || {};
  if (tier !== "managed") {
    return res.status(400).json({ error: "Unsupported tier", code: "unsupported_tier" });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required", code: "invalid_email" });
  }
  // Default to the entry paid plan; the gateway rejects unknown plans.
  const selected = typeof plan === "string" && plan.length > 0 ? plan : "indie";
  if (!Object.prototype.hasOwnProperty.call(MANAGED_PLANS, selected)) {
    return res.status(400).json({ error: "Unsupported plan", code: "unsupported_plan", plans: Object.keys(MANAGED_PLANS) });
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

  // Create a Lightning invoice on the gateway (ADR-009: the gateway is the
  // single monetization surface). This returns an invoice to pay; it never
  // reports a completed purchase or a provisioned key — the entitlement is
  // minted by the gateway after settlement. The site never sees the buyer's
  // payment; it only relays the invoice request.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(`${billingBase()}/api/v1/billing/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: selected }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      return res.status(502).json({
        error: "The billing rail did not issue an invoice",
        code: "invoice_unavailable",
        plan: selected,
        next: "Try again shortly, or contact the commercial team",
      });
    }
    const invoice = await response.json();
    return res.status(200).json({
      tier: MANAGED_TIER.id,
      plan: selected,
      availability: "available",
      paymentRail: "lightning",
      // The bolt11 invoice is the payable artifact; the buyer pays it in any
      // Lightning wallet. `invoice_id` is what the gateway verifies against.
      invoiceId: invoice.invoice_id,
      paymentRequest: invoice.payment_request,
      amountSats: invoice.amount_sats,
      expiresAt: invoice.expires_at,
      term: invoice.term,
      entitlement: "pending-payment",
      next: "Pay the invoice from a Lightning wallet; your managed API key is issued after settlement",
    });
  } catch (error) {
    return res.status(502).json({
      error: "The billing rail could not be reached",
      code: "billing_unreachable",
      plan: selected,
      next: "Try again shortly, or contact the commercial team",
    });
  }
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

app.post("/api/onboarding/request-access", onboardingLimiter, async (req, res) => {
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
// Test-only hook: drops the cached probe snapshot so consecutive regression
// cases can exercise fresh sweeps without waiting out PROBE_CACHE_MS.
app.resetStatusProbeCache = () => {
  probeCache = { at: 0, results: null, productionKey: "" };
  probeInFlight = null;
};

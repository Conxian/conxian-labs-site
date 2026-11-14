const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const app = require("../server.js");

// The managed tier must never advertise an offer it cannot honour. These tests
// pin the gate: the tier is "live" only when the gateway billing base AND the
// delivery endpoint are configured, and unavailable otherwise. Checkout is the
// gateway's Lightning invoice rail, so no static checkout URL is ever emitted.
const root = path.join(__dirname, "..");
const saved = {
  MANAGED_BILLING_BASE_URL: process.env.MANAGED_BILLING_BASE_URL,
  MANAGED_GATEWAY_ENDPOINT: process.env.MANAGED_GATEWAY_ENDPOINT,
};
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
});

async function managed() {
  return (await fetch(base + "/api/pricing/managed")).json();
}

test("unconfigured managed tier is reference-only and unavailable", async () => {
  delete process.env.MANAGED_BILLING_BASE_URL;
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await managed();
  assert.equal(body.pricingStatus, "reference-only");
  assert.equal(body.availability, "unavailable");
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.productionSupported, false);
  assert.deepEqual(body.features, []);
  assert.equal(body.paymentRail, null);
});

test("a billing base alone is a complete offer, endpoint defaulting to the base", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await managed();
  assert.equal(body.availability, "available");
  assert.equal(body.productionSupported, true);
  // The billing rail is the gateway host, so it is also the delivery endpoint.
  assert.equal(body.endpoint, "https://gateway.conxian.org");
  assert.equal(body.paymentRail, "lightning");
  assert.deepEqual(body.qualificationRequired, ["payment", "entitlement"]);
});

test("a delivery endpoint alone does not make the tier available", async () => {
  delete process.env.MANAGED_BILLING_BASE_URL;
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const body = await managed();
  assert.equal(body.availability, "unavailable");
  assert.equal(body.endpoint, null);
});

test("both settings configured makes the tier live on the Lightning rail", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const body = await managed();
  assert.equal(body.pricingStatus, "live");
  assert.equal(body.availability, "available");
  // No static checkout URL: the invoice is created per request.
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.paymentRail, "lightning");
  assert.equal(body.endpoint, "https://gateway.conxian.org/v1/managed");
  assert.deepEqual(body.plans, ["starter", "indie", "business", "enterprise"]);
  assert.deepEqual(body.qualificationRequired, ["payment", "entitlement"]);
});

test("an unsafe billing base keeps the tier unavailable", async () => {
  const invalidBases = [
    "javascript:alert(1)",
    "http://gateway.conxian.org",
    "https://user:secret@gateway.conxian.org",
    "https://gateway.example.invalid",
    "   ",
  ];
  for (const baseUrl of invalidBases) {
    process.env.MANAGED_BILLING_BASE_URL = baseUrl;
    process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
    const body = await managed();
    assert.equal(body.pricingStatus, "reference-only", `base ${baseUrl} must not go live`);
    assert.equal(body.availability, "unavailable");
    assert.equal(body.checkoutUrl, null);
    assert.equal(body.productionSupported, false);
  }
});

test("an unsafe endpoint falls back to the valid billing base", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "javascript:alert(1)";
  const body = await managed();
  // The offer is live (the rail is configured) but the endpoint never points at
  // an unsafe host: it defaults to the validated billing base.
  assert.equal(body.availability, "available");
  assert.equal(body.endpoint, "https://gateway.conxian.org");
});

test("subscribe fails closed when the tier is unavailable", async () => {
  delete process.env.MANAGED_BILLING_BASE_URL;
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const res = await fetch(base + "/api/onboarding/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tier: "managed", email: "buyer@example.com" }),
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, "subscription_unavailable");
  assert.equal(body.checkoutUrl, null);
});

test("subscribe rejects an unknown plan before contacting the gateway", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const res = await fetch(base + "/api/onboarding/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tier: "managed", plan: "free-lunch", email: "buyer@example.com" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, "unsupported_plan");
});

test("subscribe relays a Lightning invoice from the gateway", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/subscribe")) {
      const sent = JSON.parse(opts.body);
      assert.equal(sent.plan, "business");
      return {
        ok: true,
        json: async () => ({
          invoice_id: "inv_abc", payment_request: "lnbc1u1p...", amount_sats: 128000,
          expires_at: 1893456000, term: "monthly",
        }),
      };
    }
    return realFetch(url, opts);
  };
  try {
    const res = await fetch(base + "/api/onboarding/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tier: "managed", plan: "business", email: "buyer@example.com" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.paymentRail, "lightning");
    assert.equal(body.paymentRequest, "lnbc1u1p...");
    assert.equal(body.amountSats, 128000);
    assert.equal(body.invoiceId, "inv_abc");
    assert.equal(body.entitlement, "pending-payment");
  } finally {
    global.fetch = realFetch;
  }
});

test("subscribe fails closed when the gateway cannot issue an invoice", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/subscribe")) {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    return realFetch(url, opts);
  };
  try {
    const res = await fetch(base + "/api/onboarding/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tier: "managed", email: "buyer@example.com" }),
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.code, "invoice_unavailable");
  } finally {
    global.fetch = realFetch;
  }
});

test("verify relays a settlement and returns the once-only key", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/verify")) {
      const sent = JSON.parse(opts.body);
      assert.equal(sent.plan, "indie");
      assert.equal(sent.tenant_id, "inv_abc12345");
      assert.equal(sent.invoice_id, "inv_abc12345");
      return {
        ok: true,
        status: 200,
        json: async () => ({ api_key: "cxn_agent_deadbeef", jwt: "jwt.t", tier: "indie", expires_at: 1893456000 }),
      };
    }
    return realFetch(url, opts);
  };
  try {
    const res = await fetch(base + "/api/onboarding/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: "indie", invoiceId: "inv_abc12345", email: "buyer@example.com" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.entitlement, "active");
    assert.equal(body.apiKey, "cxn_agent_deadbeef");
    assert.equal(body.endpoint, "https://gateway.conxian.org/v1/managed");
  } finally {
    global.fetch = realFetch;
  }
});

test("verify fails closed and never returns a key before settlement", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/verify")) {
      return { ok: false, status: 402, json: async () => ({ error: "Lightning invoice not settled" }) };
    }
    return realFetch(url, opts);
  };
  try {
    const res = await fetch(base + "/api/onboarding/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: "indie", invoiceId: "inv_abc12345", email: "buyer@example.com" }),
    });
    assert.equal(res.status, 402);
    const body = await res.json();
    assert.equal(body.code, "not_settled");
    assert.equal(body.settled, false);
    assert.equal(body.apiKey, undefined);
  } finally {
    global.fetch = realFetch;
  }
});

test("verify rejects a malformed invoice id before contacting the gateway", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const realFetch = global.fetch;
  let called = false;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/verify")) called = true;
    return realFetch(url, opts);
  };
  try {
    const res = await fetch(base + "/api/onboarding/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: "indie", invoiceId: "bad id!", email: "buyer@example.com" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "invalid_invoice");
    assert.equal(called, false);
  } finally {
    global.fetch = realFetch;
  }
});

test("verify fails closed when the tier is unavailable", async () => {
  delete process.env.MANAGED_BILLING_BASE_URL;
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const res = await fetch(base + "/api/onboarding/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "indie", invoiceId: "inv_abc12345", email: "buyer@example.com" }),
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, "subscription_unavailable");
  assert.equal(body.apiKey, undefined);
});

test("the research page documents the managed-tier chain and its gate", () => {
  const html = fs.readFileSync(path.join(root, "research", "index.html"), "utf8");
  assert.ok(html.includes('id="managed-tier-enablement"'), "research must expose the #managed-tier-enablement anchor");
  assert.ok(html.includes("Managed Tier End-to-End Model"), "research must document the end-to-end model");
  for (const term of ["MANAGED_BILLING_BASE_URL", "MANAGED_GATEWAY_ENDPOINT", "fail-closed", "idempotent"]) {
    assert.ok(html.toLowerCase().includes(term.toLowerCase()), `research must mention ${term}`);
  }
});

test("the env template documents both managed-tier settings", () => {
  const env = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  assert.ok(env.includes("MANAGED_BILLING_BASE_URL"), ".env.example must document MANAGED_BILLING_BASE_URL");
  assert.ok(env.includes("MANAGED_GATEWAY_ENDPOINT"), ".env.example must document MANAGED_GATEWAY_ENDPOINT");
});

test("the pricing page advertises the resolvable managed endpoint path", () => {
  // The gateway nests its managed surface under /api/v1, so the customer-facing
  // path is /api/v1/agent. A bare /v1/agent is a 404 — never publish it.
  const html = fs.readFileSync(path.join(root, "pricing", "index.html"), "utf8");
  assert.ok(html.includes("https://api.conxian-labs.com/api/v1/agent"), "pricing must show the resolvable /api/v1/agent path");
  assert.ok(!/api\.conxian-labs\.com\/v1\/agent/.test(html), "pricing must not advertise the 404 /v1/agent path");
});

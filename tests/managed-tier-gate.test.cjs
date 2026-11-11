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

test("a billing base alone does not make the tier available", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await managed();
  assert.equal(body.availability, "unavailable");
  assert.equal(body.endpoint, null);
  // runtime-provisioning is still required while the endpoint is unset.
  assert.ok(body.qualificationRequired.includes("runtime-provisioning"));
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

test("malformed, unsafe, and reserved URLs keep the tier unavailable", async () => {
  const invalidPairs = [
    ["javascript:alert(1)", "https://gateway.conxian.org/v1/managed"],
    ["https://gateway.conxian.org", "javascript:alert(1)"],
    ["http://gateway.conxian.org", "https://gateway.conxian.org/v1/managed"],
    ["https://user:secret@gateway.conxian.org", "https://gateway.conxian.org/v1/managed"],
    ["https://gateway.example.invalid", "https://gateway.conxian.org/v1/managed"],
    ["   ", "https://gateway.conxian.org/v1/managed"],
  ];

  for (const [base, endpoint] of invalidPairs) {
    process.env.MANAGED_BILLING_BASE_URL = base;
    process.env.MANAGED_GATEWAY_ENDPOINT = endpoint;
    const body = await managed();
    assert.equal(body.pricingStatus, "reference-only");
    assert.equal(body.availability, "unavailable");
    assert.equal(body.checkoutUrl, null);
    assert.equal(body.productionSupported, false);
  }
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

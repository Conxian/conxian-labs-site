const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const app = require("../server.js");

// The managed tier must never advertise an offer it cannot honour. These tests
// pin the two-setting gate: the tier is "live" only when BOTH a checkout URL and
// a delivery endpoint are configured, and unavailable otherwise.
const root = path.join(__dirname, "..");
const saved = {
  MERCHANT_CHECKOUT_URL: process.env.MERCHANT_CHECKOUT_URL,
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
  delete process.env.MERCHANT_CHECKOUT_URL;
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await managed();
  assert.equal(body.pricingStatus, "reference-only");
  assert.equal(body.availability, "unavailable");
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.productionSupported, false);
  assert.deepEqual(body.features, []);
});

test("a checkout URL alone does not make the tier available", async () => {
  process.env.MERCHANT_CHECKOUT_URL = "https://checkout.example.invalid/managed";
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await managed();
  assert.equal(body.availability, "unavailable");
  assert.equal(body.checkoutUrl, null);
  // runtime-provisioning is still required while the endpoint is unset.
  assert.ok(body.qualificationRequired.includes("runtime-provisioning"));
});

test("a delivery endpoint alone does not make the tier available", async () => {
  delete process.env.MERCHANT_CHECKOUT_URL;
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.example.invalid/managed";
  const body = await managed();
  assert.equal(body.availability, "unavailable");
  assert.equal(body.endpoint, null);
});

test("valid public HTTPS settings make the tier live", async () => {
  process.env.MERCHANT_CHECKOUT_URL = "https://checkout.lemonsqueezy.com/buy/managed";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://gateway.conxian.org/v1/managed";
  const body = await managed();
  assert.equal(body.pricingStatus, "live");
  assert.equal(body.availability, "available");
  assert.equal(body.checkoutUrl, "https://checkout.lemonsqueezy.com/buy/managed");
  assert.equal(body.endpoint, "https://gateway.conxian.org/v1/managed");
  assert.deepEqual(body.qualificationRequired, ["payment", "entitlement"]);
});

test("malformed, unsafe, and reserved URLs keep the tier unavailable", async () => {
  const invalidPairs = [
    ["javascript:alert(1)", "https://gateway.conxian.org/v1/managed"],
    ["https://checkout.lemonsqueezy.com/buy/managed", "javascript:alert(1)"],
    ["http://checkout.example.com/managed", "https://gateway.conxian.org/v1/managed"],
    ["https://user:secret@checkout.example.com/managed", "https://gateway.conxian.org/v1/managed"],
    ["https://checkout.example.invalid/managed", "https://gateway.example.invalid/managed"],
    ["   ", "https://gateway.conxian.org/v1/managed"],
  ];

  for (const [checkout, endpoint] of invalidPairs) {
    process.env.MERCHANT_CHECKOUT_URL = checkout;
    process.env.MANAGED_GATEWAY_ENDPOINT = endpoint;
    const body = await managed();
    assert.equal(body.pricingStatus, "reference-only");
    assert.equal(body.availability, "unavailable");
    assert.equal(body.checkoutUrl, null);
    assert.equal(body.productionSupported, false);
  }
});

test("subscribe fails closed when the tier is unavailable", async () => {
  delete process.env.MERCHANT_CHECKOUT_URL;
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

test("the research page documents the managed-tier chain and its gate", () => {
  const html = fs.readFileSync(path.join(root, "research", "index.html"), "utf8");
  assert.ok(html.includes('id="managed-tier-enablement"'), "research must expose the #managed-tier-enablement anchor");
  assert.ok(html.includes("Managed Tier End-to-End Model"), "research must document the end-to-end model");
  for (const term of ["MERCHANT_CHECKOUT_URL", "MANAGED_GATEWAY_ENDPOINT", "fail-closed", "idempotent"]) {
    assert.ok(html.toLowerCase().includes(term.toLowerCase()), `research must mention ${term}`);
  }
});

test("the env template documents both managed-tier settings", () => {
  const env = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  assert.ok(env.includes("MERCHANT_CHECKOUT_URL"), ".env.example must document MERCHANT_CHECKOUT_URL");
  assert.ok(env.includes("MANAGED_GATEWAY_ENDPOINT"), ".env.example must document MANAGED_GATEWAY_ENDPOINT");
});

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
// Configuration alone must never expose an unqualified purchase path.
process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
const app = require("../server.js");
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
const post = body => fetch(`${base}/api/onboarding/subscribe`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
test("service catalog preserves intended routes without claiming verified deployments", async () => {
  const response = await fetch(`${base}/api/services`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.status, "unverified");
  assert.equal(body.scope, "reference-catalog");
  assert.equal(body.productionSupported, false);
  assert.equal(body.routingStatus, "intended-unverified");
  assert.deepEqual(body.services.map(({ id, route }) => [id, route]), [
    ["bos", "/bos"], ["nexus", "/research"], ["gateway", "/docs"],
    ["market", "/commercial"], ["sdk", "/sdk"], ["corelibs", "/docs"],
  ]);
  for (const service of body.services) {
    assert.equal(service.productionSupported, false);
  }
  // market/sdk/corelibs are published libraries, not independently-run
  // runtimes, so they are catalogued as libraries rather than uptime targets.
  for (const id of ["market", "sdk", "corelibs"]) {
    assert.equal(body.services.find(service => service.id === id).status, "library");
  }
  for (const id of ["bos", "nexus", "gateway"]) {
    assert.equal(body.services.find(service => service.id === id).status, "active");
  }
  assert.equal(body.infrastructureTopology.status, "historical-reference");
  assert.equal(body.infrastructureTopology.verified, false);
  assert.equal(body.routingMatrix["conxian-business"], "bos.conxian-labs.com");
});
test("health verifies only this web process", async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.status, "healthy");
  assert.equal(body.scope, "web-process");
  assert.equal(body.dependenciesVerified, false);
  assert.equal(body.infrastructure.status, "unverified");
});
test("BOS discovery page and published site map remain accessible", async () => {
  const response = await fetch(`${base}/bos`, { redirect: "manual" });
  assert.equal(response.status, 200);
  const siteMap = await (await fetch(`${base}/api/site-map`)).json();
  assert.equal(siteMap.total, siteMap.routes.length);
  assert.ok(siteMap.routes.some(({ route }) => route === "/bos"));
  assert.ok(siteMap.routes.some(({ route }) => route === "/enterprise"));
  assert.equal((await fetch(`${base}/enterprise`)).status, 200);
});
test("pricing preserves reference amounts without a live offer or payment pointer", async () => {
  const response = await fetch(`${base}/api/pricing/managed`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.monthlyUsd, 200);
  assert.equal(body.pricingStatus, "reference-only");
  assert.equal(body.availability, "unavailable");
  assert.equal(body.productionSupported, false);
  for (const field of ["endpoint", "checkoutUrl", "x402PaymentPointer"]) assert.equal(body[field], null);
  assert.deepEqual(body.features, []);
});
test("valid signup cannot report purchase, entitlement or provisioning success", async () => {
  const response = await post({ tier: "managed", email: "buyer@example.invalid" });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.code, "subscription_unavailable");
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.x402Demand, null);
  assert.equal(body.availability, "unavailable");
  for (const field of ["apiKey", "license", "entitlement", "provisioned"]) assert.equal(body[field], undefined);
});
test("unconfigured checkout remains unavailable", async () => {
  delete process.env.MANAGED_BILLING_BASE_URL;
  assert.equal((await post({ tier: "managed", email: "buyer@example.invalid" })).status, 503);
});
test("invalid tier keeps its validation error", async () => {
  const response = await post({ tier: "unsupported", email: "buyer@example.invalid" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "unsupported_tier");
});
test("invalid email keeps its validation error", async () => {
  const response = await post({ tier: "managed", email: "invalid" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_email");
});
test("health and static pricing remain accessible", async () => {
  for (const path of ["/api/health", "/pricing"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    await response.arrayBuffer();
  }
});
test("a billing base alone does not advertise an offer without a delivery endpoint", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  delete process.env.MANAGED_GATEWAY_ENDPOINT;
  const body = await (await fetch(`${base}/api/pricing/managed`)).json();
  assert.equal(body.productionSupported, false);
  assert.equal(body.availability, "unavailable");
  assert.equal(body.checkoutUrl, null);
  assert.equal((await post({ tier: "managed", email: "buyer@example.invalid" })).status, 503);
});
test("a fully configured deployment relays a Lightning invoice without claiming entitlement", async () => {
  process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
  process.env.MANAGED_GATEWAY_ENDPOINT = "https://api.conxian-labs.com/v1/agent";
  const pricing = await (await fetch(`${base}/api/pricing/managed`)).json();
  assert.equal(pricing.productionSupported, true);
  assert.equal(pricing.availability, "available");
  assert.equal(pricing.paymentRail, "lightning");
  assert.equal(pricing.checkoutUrl, null);

  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes("/api/v1/billing/subscribe")) {
      return { ok: true, json: async () => ({
        invoice_id: "inv_x", payment_request: "lnbc1u1p...", amount_sats: 37700,
        expires_at: 1893456000, term: "monthly",
      }) };
    }
    return realFetch(url, opts);
  };
  try {
    const response = await post({ tier: "managed", plan: "indie", email: "buyer@example.invalid" });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.paymentRequest, "lnbc1u1p...");
    assert.equal(body.amountSats, 37700);
    assert.equal(body.entitlement, "pending-payment");
    for (const field of ["apiKey", "license", "provisioned"]) assert.equal(body[field], undefined);
  } finally {
    global.fetch = realFetch;
    delete process.env.MANAGED_GATEWAY_ENDPOINT;
  }
});

const postAccess = body => fetch(`${base}/api/onboarding/request-access`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

test("request-access fails closed when online intake is unconfigured", async () => {
  delete process.env.ACCESS_REQUEST_ENDPOINT;
  const response = await postAccess({ email: "buyer@example.invalid", organization: "ACME", need: "gateway" });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.received, false);
  assert.equal(body.code, "intake_not_configured");
  assert.match(body.fallbackUrl, /^mailto:labs@conxian-labs\.com/);
  // The response must not echo the submitted personal data.
  assert.equal(JSON.stringify(body).includes("buyer@example.invalid"), false);
  assert.equal(JSON.stringify(body).includes("ACME"), false);
});

test("request-access validates the email before any intake call", async () => {
  const response = await postAccess({ email: "invalid" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_email");
});

test("request-access reports received only after the intake accepts", async () => {
  const http = require("node:http");
  const intake = http.createServer((req, res) => {
    assert.equal(req.method, "POST");
    res.statusCode = 204;
    res.end();
  });
  await new Promise(resolve => intake.listen(0, "127.0.0.1", resolve));
  process.env.ACCESS_REQUEST_ENDPOINT = `http://127.0.0.1:${intake.address().port}/intake`;
  try {
    const response = await postAccess({ email: "buyer@example.invalid" });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.received, true);
    for (const field of ["apiKey", "entitlement", "provisioned", "license"]) assert.equal(body[field], undefined);
  } finally {
    intake.close();
    delete process.env.ACCESS_REQUEST_ENDPOINT;
  }
});

test("request-access does not claim receipt when the intake rejects", async () => {
  const http = require("node:http");
  const intake = http.createServer((req, res) => { res.statusCode = 500; res.end(); });
  await new Promise(resolve => intake.listen(0, "127.0.0.1", resolve));
  process.env.ACCESS_REQUEST_ENDPOINT = `http://127.0.0.1:${intake.address().port}/intake`;
  try {
    const response = await postAccess({ email: "buyer@example.invalid" });
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.received, false);
    assert.equal(body.code, "intake_failed");
    assert.match(body.fallbackUrl, /^mailto:/);
  } finally {
    intake.close();
    delete process.env.ACCESS_REQUEST_ENDPOINT;
  }
});

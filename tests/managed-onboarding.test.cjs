const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
// Configuration alone must never expose an unqualified purchase path.
process.env.MERCHANT_CHECKOUT_URL = "https://checkout.example.invalid/managed";
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
    ["bos", "/enterprise"], ["nexus", "/research"], ["gateway", "/docs"],
    ["market", "/commercial"], ["sdk", "/sdk"], ["platform", "/operators"], ["corelibs", "/docs"],
  ]);
  for (const service of body.services) {
    assert.equal(service.status, "unverified");
    assert.equal(service.productionSupported, false);
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
test("BOS discovery redirect and published site map remain accessible", async () => {
  const response = await fetch(`${base}/bos`, { redirect: "manual" });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "/enterprise");
  const siteMap = await (await fetch(`${base}/api/site-map`)).json();
  assert.equal(siteMap.total, siteMap.routes.length);
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
  delete process.env.MERCHANT_CHECKOUT_URL;
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

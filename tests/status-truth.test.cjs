const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const realFetch = global.fetch;
const realProduction = process.env.STATUS_PRODUCTION_SERVICES;
process.env.STATUS_PRODUCTION_SERVICES = "";
const app = require("../server.js");
let server, base;
const hosts = [
  "https://bos.conxian-labs.com/api/health",
  "https://gateway.conxian.org/api/v1/health",
  "https://nexus.conxian.org/health",
  "https://market.conxian.org/api/health",
  "https://sdk.conxian.org/api/health",
  "https://docs.conxian.org/api/health",
];
let responses = {};
function mock(status, service, extra = {}) {
  return { status, text: async () => JSON.stringify({ service, status: "healthy", ...extra }) };
}
before(async () => {
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  global.fetch = async url => {
    const target = String(url);
    if (target.startsWith(base)) return realFetch(url);
    return responses[target] || mock(503, null);
  };
});
after(async () => {
  global.fetch = realFetch;
  if (realProduction === undefined) delete process.env.STATUS_PRODUCTION_SERVICES;
  else process.env.STATUS_PRODUCTION_SERVICES = realProduction;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});
// Each test uses a unique production configuration, invalidating the snapshot cache.
test("uncommissioned aliases cannot trigger false production major outage", async () => {
  process.env.STATUS_PRODUCTION_SERVICES = "";
  responses = Object.fromEntries(hosts.map(url => [url, mock(200, "conxian-labs-site")]));
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.overall, "unverified");
  assert.equal(body.production.commissioned, 0);
  assert.equal(body.verified, 0);
  assert.ok(body.services.every(s => s.lifecycle === "uncommissioned"));
  assert.ok(body.services.every(s => s.alias === true));
});
test("HTTP 200 from wrong runtime is unverified, not green", async () => {
  process.env.STATUS_PRODUCTION_SERVICES = "gateway";
  responses = Object.fromEntries(hosts.map(url => [url, mock(200, "conxian-labs-site")]));
  responses[hosts[1]] = mock(200, "unrelated-service");
  const body = await (await realFetch(base + "/api/status")).json();
  const gateway = body.services.find(s => s.id === "gateway");
  assert.equal(gateway.identityMatches, false);
  assert.equal(gateway.verified, false);
  assert.equal(gateway.state, "unverified");
  assert.equal(body.production.unverified, 1);
  assert.equal(body.overall, "partial-outage");
});
test("safety mode remains degraded despite matching identity", async () => {
  process.env.STATUS_PRODUCTION_SERVICES = "bos,gateway";
  responses[hosts[0]] = mock(200, "conxian-business", { safety_mode: true });
  responses[hosts[1]] = mock(200, "conxian-gateway");
  const body = await (await realFetch(base + "/api/status")).json();
  const bos = body.services.find(s => s.id === "bos");
  assert.equal(bos.verified, false);
  assert.equal(bos.safetyMode, true);
  assert.equal(bos.state, "degraded");
  assert.equal(body.production.degraded, 1);
  assert.equal(body.production.operational, 1);
  assert.equal(body.overall, "partial-outage");
});
test("outage calculations are scoped to explicitly commissioned runtimes", async () => {
  process.env.STATUS_PRODUCTION_SERVICES = "bos,gateway,nexus";
  responses[hosts[0]] = mock(503, "conxian-business");
  responses[hosts[1]] = mock(503, "conxian-gateway");
  responses[hosts[2]] = mock(503, "conxian-nexus");
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.overall, "major-outage");
  assert.equal(body.production.unreachable, 3);
  assert.equal(body.production.commissioned, 3);
});

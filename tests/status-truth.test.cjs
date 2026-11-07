const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const realFetch = global.fetch;
const realProduction = process.env.STATUS_PRODUCTION_SERVICES;
const realLimits = {
  attempts: process.env.STATUS_PROBE_ATTEMPTS,
  timeout: process.env.STATUS_PROBE_ATTEMPT_TIMEOUT_MS,
  backoff: process.env.STATUS_PROBE_BACKOFF_MS,
  budget: process.env.STATUS_PROBE_TOTAL_BUDGET_MS,
};
process.env.STATUS_PRODUCTION_SERVICES = "";
// Keep the retry budget tiny so the cold-start tests stay fast.
process.env.STATUS_PROBE_ATTEMPTS = "3";
process.env.STATUS_PROBE_ATTEMPT_TIMEOUT_MS = "50";
process.env.STATUS_PROBE_BACKOFF_MS = "1";
process.env.STATUS_PROBE_TOTAL_BUDGET_MS = "60000";
const app = require("../server.js");
let server, base;
const hosts = [
  "https://bos.conxian-labs.com/api/health",
  "https://gateway.conxian.org/api/v1/health",
  "https://nexus.conxian.org/health",
];
let responses = {};
let calls = {};
function mock(status, service, extra = {}) {
  return { status, text: async () => JSON.stringify({ service, status: "healthy", ...extra }) };
}
function fail(name = "AbortError") {
  const error = new Error("simulated transport failure");
  error.name = name;
  return error;
}
before(async () => {
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  global.fetch = async url => {
    const target = String(url);
    if (target.startsWith(base)) return realFetch(url);
    calls[target] = (calls[target] || 0) + 1;
    const scripted = responses[target];
    if (typeof scripted === "function") return scripted(calls[target]);
    if (Array.isArray(scripted)) return scripted[Math.min(calls[target] - 1, scripted.length - 1)];
    return scripted || mock(503, null);
  };
});
after(async () => {
  global.fetch = realFetch;
  if (realProduction === undefined) delete process.env.STATUS_PRODUCTION_SERVICES;
  else process.env.STATUS_PRODUCTION_SERVICES = realProduction;
  const restore = {
    STATUS_PROBE_ATTEMPTS: realLimits.attempts,
    STATUS_PROBE_ATTEMPT_TIMEOUT_MS: realLimits.timeout,
    STATUS_PROBE_BACKOFF_MS: realLimits.backoff,
    STATUS_PROBE_TOTAL_BUDGET_MS: realLimits.budget,
  };
  for (const [key, value] of Object.entries(restore)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});
// Each test resets both the mocked responses and the cached probe snapshot.
function reset() {
  responses = {};
  calls = {};
  app.resetStatusProbeCache();
}
test("uncommissioned aliases cannot trigger false production major outage", async () => {
  reset();
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
  reset();
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
  reset();
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
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "bos,gateway,nexus";
  responses[hosts[0]] = mock(503, "conxian-business");
  responses[hosts[1]] = mock(503, "conxian-gateway");
  responses[hosts[2]] = mock(503, "conxian-nexus");
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.overall, "major-outage");
  assert.equal(body.production.unreachable, 3);
  assert.equal(body.production.commissioned, 3);
});

test("a cold start that answers on retry is operational, not unreachable", async () => {
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "bos,gateway,nexus";
  // First attempt fails like a spun-down free instance; the retry answers.
  const coldThenWarm = service => attempt =>
    attempt === 1 ? Promise.reject(fail()) : mock(200, service);
  responses[hosts[0]] = coldThenWarm("conxian-business");
  responses[hosts[1]] = coldThenWarm("conxian-gateway");
  responses[hosts[2]] = coldThenWarm("conxian-nexus");
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.overall, "operational");
  assert.equal(body.production.unreachable, 0);
  assert.equal(body.production.operational, 3);
  assert.equal(body.down, 0);
  // The wake-up is disclosed rather than hidden.
  assert.equal(body.coldStarts, 3);
  assert.ok(body.services.every(s => s.coldStart === true && s.attempts === 2));
});

test("a runtime that never answers stays unreachable after every attempt", async () => {
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "bos,gateway,nexus";
  responses[hosts[0]] = () => Promise.reject(fail());
  responses[hosts[1]] = () => Promise.reject(fail());
  responses[hosts[2]] = () => Promise.reject(fail());
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.overall, "major-outage");
  assert.equal(body.production.unreachable, 3);
  assert.equal(body.coldStarts, 0);
  // Exactly the configured attempt budget was spent, no more.
  assert.equal(calls[hosts[0]], 3);
  assert.ok(body.services.every(s => s.attempts === 3 && s.coldStart === false));
});

test("HTTP error responses are not retried; they are honest answers", async () => {
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "gateway";
  responses[hosts[1]] = mock(503, "conxian-gateway");
  const body = await (await realFetch(base + "/api/status")).json();
  const gateway = body.services.find(s => s.id === "gateway");
  assert.equal(gateway.state, "unreachable");
  assert.equal(gateway.attempts, 1);
  assert.equal(calls[hosts[1]], 1);
});

test("concurrent callers share one probe sweep instead of stampeding the services", async () => {
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "gateway";
  responses[hosts[1]] = async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
    return mock(200, "conxian-gateway");
  };
  const [a, b, c] = await Promise.all([
    realFetch(base + "/api/status").then(r => r.json()),
    realFetch(base + "/api/status").then(r => r.json()),
    realFetch(base + "/api/status").then(r => r.json()),
  ]);
  assert.equal(a.overall, "operational");
  assert.equal(b.overall, "operational");
  assert.equal(c.overall, "operational");
  // One sweep, one call per host, regardless of how many callers arrived.
  assert.equal(calls[hosts[1]], 1);
});

test("the probe budget is reported so operators can audit it", async () => {
  reset();
  process.env.STATUS_PRODUCTION_SERVICES = "gateway";
  responses[hosts[1]] = mock(200, "conxian-gateway");
  const body = await (await realFetch(base + "/api/status")).json();
  assert.equal(body.probe.attempts, 3);
  assert.equal(body.probe.attemptTimeoutMs, 50);
  assert.equal(body.probe.totalBudgetMs, 60000);
});

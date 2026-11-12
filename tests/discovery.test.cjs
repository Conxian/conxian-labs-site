const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("../server.js");

let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
});

test("/llms.txt is served as text/plain and is non-empty", async () => {
  const res = await fetch(base + "/llms.txt");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/plain/);
  const body = await res.text();
  assert.ok(body.includes("# Conxian Labs"));
  assert.ok(body.includes("https://www.conxian-labs.com/api/status"));
});

test("/.well-known/security.txt is served as text/plain with a Contact field", async () => {
  const res = await fetch(base + "/.well-known/security.txt");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/plain/);
  const body = await res.text();
  assert.match(body, /^Contact: mailto:/m);
  assert.match(body, /^Canonical: https:\/\/www\.conxian-labs\.com\/\.well-known\/security\.txt$/m);
});

test("homepage exposes JSON-LD Organization/WebSite/Service", async () => {
  const res = await fetch(base + "/");
  const html = await res.text();
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type": "Organization"/);
  assert.match(html, /"@type": "WebSite"/);
  assert.match(html, /"@type": "Service"/);
});

test("pricing page exposes Service + Offer JSON-LD generated from the catalogue", async () => {
  const res = await fetch(base + "/pricing");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length >= 1, "pricing page must embed JSON-LD");
  const graph = blocks.map(b => JSON.parse(b[1])).flatMap(d => d["@graph"] || [d]);
  const service = graph.find(n => n["@type"] === "Service");
  assert.ok(service, "pricing page must expose a Service node");
  const offer = service.offers;
  assert.ok(offer && offer["@type"] === "Offer", "Service must carry an Offer");
  // Offer must not drift from the API descriptor.
  const api = await (await fetch(base + "/api/pricing/managed")).json();
  assert.equal(offer.price, String(api.monthlyUsd));
  assert.equal(offer.priceCurrency, "USD");
  assert.equal(
    offer.availability,
    api.productionSupported ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
  );
  if (!api.productionSupported) {
    assert.equal(offer.potentialAction, undefined, "unavailable tier must not advertise a checkout action");
  }
});

test("get-started and sdk pages carry the same Service + Offer JSON-LD as /pricing", async () => {
  const api = await (await fetch(base + "/api/pricing/managed")).json();
  for (const route of ["/get-started", "/sdk"]) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, `${route} must be served`);
    const html = await res.text();
    const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length >= 1, `${route} must embed JSON-LD`);
    const graph = blocks.map(b => JSON.parse(b[1])).flatMap(d => d["@graph"] || [d]);
    const service = graph.find(n => n["@type"] === "Service");
    assert.ok(service, `${route} must expose a Service node`);
    const offer = service.offers;
    assert.ok(offer && offer["@type"] === "Offer", `${route} Service must carry an Offer`);
    // The structured data is generated from the live catalogue, so it matches
    // /api/pricing/managed on every page that advertises the service.
    assert.equal(offer.price, String(api.monthlyUsd));
    assert.equal(offer.priceCurrency, "USD");
  }
});

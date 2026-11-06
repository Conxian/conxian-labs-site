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

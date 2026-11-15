const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");

process.env.MANAGED_BILLING_BASE_URL = "https://gateway.conxian.org";
const app = require("../server.js");

const root = path.join(__dirname, "..");
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
});

const INVOICE = "b9da0a9efb260653932469c2a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4";

test("status rejects a malformed invoice id before any gateway call", async () => {
  const res = await fetch(`${base}/api/onboarding/status?invoiceId=bad`);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal((await res.json()).code, "invalid_invoice");
});

test("status fails closed when the tier is unavailable", async () => {
  const saved = process.env.MANAGED_BILLING_BASE_URL;
  delete process.env.MANAGED_BILLING_BASE_URL;
  try {
    const res = await fetch(`${base}/api/onboarding/status?invoiceId=${INVOICE}`);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, "subscription_unavailable");
  } finally {
    process.env.MANAGED_BILLING_BASE_URL = saved;
  }
});

test("status reports pending-payment when the gateway shows no settled credit", async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("/api/v1/billing/balance")) {
      return { ok: true, status: 200, json: async () => ({ tenant_id: INVOICE, balance_sats: 0 }) };
    }
    return realFetch(url);
  };
  try {
    const res = await fetch(`${base}/api/onboarding/status?invoiceId=${INVOICE}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.entitlement, "pending-payment");
    assert.equal(body.balanceSats, 0);
    assert.equal(body.endpoint, "https://gateway.conxian.org");
    assert.equal(body.apiKey, undefined);
  } finally {
    global.fetch = realFetch;
  }
});

test("status reports active only when the gateway shows settled credit", async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("/api/v1/billing/balance")) {
      return { ok: true, status: 200, json: async () => ({ tenant_id: INVOICE, balance_sats: 37700 }) };
    }
    return realFetch(url);
  };
  try {
    const body = await (await fetch(`${base}/api/onboarding/status?invoiceId=${INVOICE}`)).json();
    assert.equal(body.entitlement, "active");
    assert.equal(body.balanceSats, 37700);
  } finally {
    global.fetch = realFetch;
  }
});

test("status fails closed when the gateway is unreachable", async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("/api/v1/billing/balance")) {
      return { ok: false, status: 502, json: async () => ({}) };
    }
    return realFetch(url);
  };
  try {
    const res = await fetch(`${base}/api/onboarding/status?invoiceId=${INVOICE}`);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, "status_unavailable");
  } finally {
    global.fetch = realFetch;
  }
});

test("no page depends on an external QR/image host (CSP img-src 'self' data:)", () => {
  for (const page of ["pricing/index.html", "get-started/index.html", "console/index.html"]) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.ok(!/qrserver|chart\.googleapis|api\.qr/.test(html), `${page} must not call an external image host`);
    assert.ok(html.includes("qrcode.min.js"), `${page} must load the self-hosted QR renderer`);
    assert.ok(html.includes("createDataURL"), `${page} must render the invoice QR locally as a data: URI`);
  }
});

test("get-started exposes the self-serve provision flow", () => {
  const html = fs.readFileSync(path.join(root, "get-started", "index.html"), "utf8");
  assert.ok(html.includes("/api/onboarding/subscribe"), "get-started must offer self-serve subscribe");
  assert.ok(html.includes("/api/onboarding/verify"), "get-started must offer the claim step");
  assert.ok(html.includes('id="request-access"'), "get-started must keep the request-access anchor");
  assert.ok(html.includes('id="access-form"'), "get-started must keep the access-request form");
});

test("the request-access fallback copy stays customer-safe", () => {
  // The intake endpoint is a private integration. A visitor must see a plain
  // "we could not record it, email us" message, never internal deployment
  // vocabulary like "not configured on this deployment" or "intake system".
  const html = fs.readFileSync(path.join(root, "get-started", "index.html"), "utf8");
  assert.ok(!/not configured/i.test(html), "get-started must not tell a visitor the intake is 'not configured'");
  assert.ok(!/intake system/i.test(html), "get-started must not expose the internal 'intake system' term");
  assert.ok(html.includes("Email the team"), "the fallback must still offer the mailto escape hatch");
});

test("console exposes the self-serve provision flow and the status lookup", () => {
  const html = fs.readFileSync(path.join(root, "console", "index.html"), "utf8");
  assert.ok(html.includes("/api/onboarding/subscribe"), "console must offer self-serve subscribe");
  assert.ok(html.includes("/api/onboarding/verify"), "console must offer the claim step");
  assert.ok(html.includes("/api/onboarding/status"), "console must offer the status lookup");
});

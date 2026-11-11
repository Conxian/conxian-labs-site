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

// An unsupported tier is rejected with 400 before any outbound call, so this
// exercises the limiter without touching the gateway.
const post = () => fetch(`${base}/api/onboarding/subscribe`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ tier: "unsupported", plan: "x", email: "buyer@example.invalid" }),
});

test("the onboarding intake is rate limited per client", async () => {
  let limited = null;
  for (let i = 0; i < 30; i += 1) {
    const response = await post();
    if (response.status === 429) {
      limited = response;
      break;
    }
    assert.equal(response.status, 400);
  }
  assert.ok(limited, "expected a 429 once the per-IP limit is exceeded");
  const body = await limited.json();
  assert.equal(body.code, "rate_limited");
  assert.equal(body.error, "Too many requests");
});

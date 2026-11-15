const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

// The front door must be a faithful relay: it reports a key only when the
// gateway actually returned one, and it never invents a tenant or an
// entitlement. These tests drive the relay with a stubbed outbound fetch so the
// success path, the fail-closed paths, and the no-key guarantee are pinned
// without a live gateway.
process.env.MANAGED_BILLING_BASE_URL = "https://gateway.example.com";
const app = require("../server.js");

let server, base;
before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(err => (err ? reject(err) : resolve())));
});

const postSignup = body => fetch(`${base}/api/signup`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

// Run `fn` with a stubbed outbound fetch that records what the relay sent.
async function withStubFetch(responder, fn) {
    const realFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, opts) => {
        if (String(url).includes("/api/v1/signup")) {
            calls.push({ url: String(url), body: JSON.parse(opts.body) });
            return responder();
        }
        return realFetch(url, opts);
    };
    try {
        return await fn(calls);
    } finally {
        global.fetch = realFetch;
    }
}

test("signup relays a real key from the gateway and does not invent one", async () => {
    await withStubFetch(
        () => ({
            ok: true, status: 200,
            json: async () => ({
                tenant_id: "acme-sandbox", tier: "sandbox", plan: "sandbox", state: "active",
                endpoint_url: "https://gateway.example.com/api/v1/agent?tenant=acme-sandbox",
                api_key: "cxn_agent_test_key",
            }),
        }),
        async calls => {
            const response = await postSignup({ tenantId: "acme-sandbox" });
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("cache-control"), "no-store");
            const body = await response.json();
            assert.equal(body.apiKey, "cxn_agent_test_key");
            assert.equal(body.tenantId, "acme-sandbox");
            assert.equal(body.tier, "sandbox");
            assert.equal(body.endpoint, "https://gateway.example.com/api/v1/agent?tenant=acme-sandbox");
            // The relay must hit the open signup lane, not the operator lane.
            assert.equal(calls[0].url, "https://gateway.example.com/api/v1/signup");
            assert.equal(calls[0].body.tenant_id, "acme-sandbox");
            assert.ok(calls[0].body.idempotency_key);
        },
    );
});

test("signup rejects an invalid sandbox name before any gateway call", async () => {
    await withStubFetch(
        () => { throw new Error("must not be called"); },
        async calls => {
            const response = await postSignup({ tenantId: "-bad name" });
            assert.equal(response.status, 400);
            assert.equal((await response.json()).code, "invalid_tenant_id");
            assert.equal(calls.length, 0, "an invalid name must not reach the gateway");
        },
    );
});

test("signup reports disabled (503) when the gateway has not enabled the lane", async () => {
    await withStubFetch(
        () => ({ ok: false, status: 404, json: async () => ({}) }),
        async () => {
            const response = await postSignup({ tenantId: "acme" });
            assert.equal(response.status, 503);
            assert.equal((await response.json()).code, "signup_disabled");
        },
    );
});

test("signup surfaces a name/capacity conflict (409) from the gateway", async () => {
    await withStubFetch(
        () => ({ ok: false, status: 409, json: async () => ({}) }),
        async () => {
            const response = await postSignup({ tenantId: "taken" });
            assert.equal(response.status, 409);
            assert.equal((await response.json()).code, "signup_conflict");
        },
    );
});

test("signup never reports success when the gateway returns no key", async () => {
    await withStubFetch(
        () => ({ ok: true, status: 200, json: async () => ({ tenant_id: "acme", tier: "sandbox" }) }),
        async () => {
            const response = await postSignup({ tenantId: "acme" });
            assert.equal(response.status, 502);
            const body = await response.json();
            assert.equal(body.code, "signup_failed");
            assert.equal(body.apiKey, undefined);
        },
    );
});

test("signup is unavailable when no gateway is configured", async () => {
    const previous = process.env.MANAGED_BILLING_BASE_URL;
    delete process.env.MANAGED_BILLING_BASE_URL;
    try {
        const response = await postSignup({ tenantId: "acme" });
        assert.equal(response.status, 503);
        assert.equal((await response.json()).code, "signup_unavailable");
    } finally {
        process.env.MANAGED_BILLING_BASE_URL = previous;
    }
});


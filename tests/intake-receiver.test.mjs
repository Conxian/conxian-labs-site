// Exercises the real intake receiver handler (infra/intake-worker/worker.mjs)
// with a fake KV and email binding. The receiver is what ACCESS_REQUEST_ENDPOINT
// points at in production, so its fail-closed contract must be pinned: it may
// only answer 2xx once a lead is durable, and an unconfigured receiver must look
// like an unknown host.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../infra/intake-worker/worker.mjs";

const PATH = "secret-path-token";

function makeEnv(overrides = {}) {
  const store = new Map();
  const leads = () => [...store.keys()].filter(key => key.startsWith("lead:"));
  return {
    store,
    leads,
    env: {
      INTAKE_PATH: PATH,
      LEADS: {
        async get(key) {
          return store.has(key) ? store.get(key) : null;
        },
        async put(key, value) {
          store.set(key, value);
        },
      },
      EMAIL: {
        sent: [],
        async send(message) {
          this.sent.push(message);
          return { messageId: "test" };
        },
      },
      ...overrides,
    },
  };
}

function post(path, body) {
  return new Request(`https://intake.conxian-labs.com/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" },
    body: JSON.stringify(body),
  });
}

test("an unconfigured receiver answers 404, never a stored-request claim", async () => {
  const { env } = makeEnv({ INTAKE_PATH: "" });
  const response = await worker.fetch(post(PATH, { email: "a@b.com" }), env);
  assert.equal(response.status, 404);
});

test("a wrong path answers 404 like any unknown host", async () => {
  const { env, store, leads } = makeEnv();
  const response = await worker.fetch(post("not-the-path", { email: "a@b.com" }), env);
  assert.equal(response.status, 404);
  assert.equal(leads().length, 0);
});

test("a non-POST method is rejected", async () => {
  const { env } = makeEnv();
  const response = await worker.fetch(new Request(`https://intake.conxian-labs.com/${PATH}`), env);
  assert.equal(response.status, 405);
});

test("a malformed email is rejected before any write", async () => {
  const { env, store, leads } = makeEnv();
  const response = await worker.fetch(post(PATH, { email: "nope" }), env);
  assert.equal(response.status, 400);
  assert.equal(leads().length, 0);
});

test("a valid submission stores an opaque lead before acknowledging", async () => {
  const { env, store, leads } = makeEnv();
  const response = await worker.fetch(
    post(PATH, { email: "buyer@example.invalid", organization: "ACME", need: "gateway", source: "conxian-labs-site" }),
    env
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.received, true);
  assert.match(body.id, /^OPP-[0-9A-HJKMNP-TV-Z]+$/);
  const stored = JSON.parse(store.get(`lead:${body.id}`));
  assert.equal(stored.email, "buyer@example.invalid");
  assert.equal(stored.organization, "ACME");
  assert.equal(stored.source, "conxian-labs-site");
  // The notification carries the contact details; the durable record is keyed by
  // the opaque id, so public records never hold customer identity.
  assert.equal(env.EMAIL.sent.length, 1);
  assert.match(env.EMAIL.sent[0].text, /buyer@example\.invalid/);
});

test("a store failure rejects the request instead of claiming receipt", async () => {
  const { env } = makeEnv({
    LEADS: {
      async get() {
        return null;
      },
      async put() {
        throw new Error("kv unavailable");
      },
    },
  });
  const response = await worker.fetch(post(PATH, { email: "buyer@example.invalid" }), env);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.received, undefined);
});

test("a notification failure after a durable write still acknowledges", async () => {
  const { env, leads } = makeEnv({
    EMAIL: {
      async send() {
        throw new Error("mail unavailable");
      },
    },
  });
  const response = await worker.fetch(post(PATH, { email: "buyer@example.invalid" }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).received, true);
  assert.equal(leads().length, 1);
});

test("a valid submission opens a tracked lifecycle:lead issue with no customer identity", async () => {
  const calls = [];
  const { env } = makeEnv({
    GITHUB_TOKEN: "test-token",
    fetch: undefined,
  });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ number: 4242, html_url: "https://github.com/Conxian/conxian-business/issues/4242" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const response = await worker.fetch(
      post(PATH, { email: "buyer@example.invalid", organization: "ACME Corp", need: "gateway pilot" }),
      env
    );
    assert.equal(response.status, 200);
    const { id } = await response.json();
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /repos\/Conxian\/conxian-business\/issues$/);
    const issue = calls[0].body;
    assert.match(issue.title, new RegExp(id));
    assert.deepEqual(issue.labels, ["lifecycle:lead", "type:sales", "state:intake", "priority:P3", "evidence:restricted"]);
    // The public record must not carry customer identity or message contents.
    assert.match(issue.body, new RegExp(id));
    for (const secret of ["buyer@example.invalid", "ACME Corp", "gateway pilot"]) {
      assert.ok(!issue.body.includes(secret), `issue body leaked: ${secret}`);
      assert.ok(!issue.title.includes(secret), `issue title leaked: ${secret}`);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a GitHub failure does not fail a durable lead", async () => {
  const { env, leads } = makeEnv({ GITHUB_TOKEN: "test-token" });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("nope", { status: 500 });
  try {
    const response = await worker.fetch(post(PATH, { email: "buyer@example.invalid" }), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).received, true);
    assert.equal(leads().length, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("no token means no issue attempt, and the lead still lands", async () => {
  const { env, leads } = makeEnv();
  const realFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 201 });
  };
  try {
    const response = await worker.fetch(post(PATH, { email: "buyer@example.invalid" }), env);
    assert.equal(response.status, 200);
    assert.equal(called, false);
    assert.equal(leads().length, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("repeated submissions from one address are rate limited", async () => {
  const { env } = makeEnv();
  let last;
  for (let i = 0; i < 6; i += 1) {
    last = await worker.fetch(post(PATH, { email: "buyer@example.invalid" }), env);
  }
  assert.equal(last.status, 429);
});

// Conxian Labs access-request intake receiver.
//
// A restricted, credential-gated receiver for the public site's access-request
// form (conxian-business #2059: form -> restricted receiver -> tracked lead).
// The site relays the submission server-to-server to a secret path; this Worker
// records the lead in KV under an opaque opportunity id and notifies the team.
//
// Fail-closed contract (mirrors the site's own handler):
//   - Without a configured path token the Worker answers 404, like any unknown
//     host, so an unconfigured receiver never implies a stored request.
//   - A lead is stored BEFORE the request is acknowledged; if the store is
//     unavailable the request is rejected (503), so the site never reports a
//     receipt it cannot back.
//   - The notification is best-effort: a mail failure must not fail a request
//     whose record is already durable.
//
// Customer identity is kept out of public records: the record lives in a
// private KV namespace keyed by an opaque id; only the notification email (to a
// verified team address) carries the contact details.

const LIMITS = { email: 254, organization: 200, need: 500, source: 64 };
const RATE_LIMIT_PER_HOUR = 5;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function bounded(value, max) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

// Crockford-style base32, ambiguity-free. 10 random bytes ~ 50 bits of entropy.
function opaqueId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `OPP-${out}`;
}

async function withinRateLimit(env, ip) {
  const window = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${ip}:${window}`;
  const seen = Number(await env.LEADS.get(key)) || 0;
  if (seen >= RATE_LIMIT_PER_HOUR) return false;
  await env.LEADS.put(key, String(seen + 1), { expirationTtl: 3600 });
  return true;
}

export default {
  async fetch(request, env) {
    const path = (env.INTAKE_PATH || "").trim();
    const url = new URL(request.url);
    if (!path || url.pathname !== `/${path}`) {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    let allowed;
    try {
      allowed = await withinRateLimit(env, ip);
    } catch {
      // The rate-limit counter shares the lead store; if KV is down the lead
      // cannot be stored either, so fail closed rather than crash.
      return json({ error: "store_unavailable" }, 503);
    }
    if (!allowed) {
      return json({ error: "rate_limited" }, 429);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return json({ error: "invalid_payload" }, 400);
    }

    const email = bounded(payload.email, LIMITS.email);
    if (!email || !email.includes("@")) {
      return json({ error: "invalid_email" }, 400);
    }
    const record = {
      id: opaqueId(),
      receivedAt: new Date().toISOString(),
      email,
      organization: bounded(payload.organization, LIMITS.organization),
      need: bounded(payload.need, LIMITS.need),
      source: bounded(payload.source, LIMITS.source) || "unknown",
    };

    try {
      await env.LEADS.put(`lead:${record.id}`, JSON.stringify(record), {
        metadata: { receivedAt: record.receivedAt, source: record.source },
      });
    } catch {
      return json({ error: "store_unavailable" }, 503);
    }

    if (env.EMAIL) {
      try {
        await env.EMAIL.send({
          to: "support@conxian-labs.com",
          from: { email: "intake@conxian.org", name: "Conxian Labs intake" },
          subject: `Access request ${record.id}`,
          text:
            `Opportunity: ${record.id}\n` +
            `Received:    ${record.receivedAt}\n` +
            `Source:      ${record.source}\n` +
            `Email:       ${record.email}\n` +
            `Organization:${record.organization}\n` +
            `Need:        ${record.need}\n`,
        });
      } catch {
        // Durable record already written; a mail failure must not fail the request.
      }
    }

    return json({ received: true, id: record.id }, 200);
  },
};

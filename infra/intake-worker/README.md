# Access-request intake receiver

A restricted receiver for the public site's gated access-request form. It is the
"restricted system, never Git" that `ACCESS_REQUEST_ENDPOINT` points at (see
`render.yaml` and `.env.example`). It implements the intake path decided in
`conxian-business` #2059: the site relays a submission server-to-server to this
receiver, which records a tracked lead under an opaque opportunity id and
notifies the team.

## Contract with the site

`server.js` (`POST /api/onboarding/request-access`) sends
`{email, organization, need, source}` as JSON and treats **any 2xx** as
"received". Anything else (including a timeout) makes the site fail closed and
offer the `mailto:` fallback, so the receiver must only answer 2xx once the lead
is durable.

| Case | Response |
|------|----------|
| Stored and acknowledged | `200 {"received":true,"id":"OPP-..."}` |
| Wrong path / unconfigured | `404` |
| Missing or malformed email | `400` |
| Too many requests from one IP | `429` |
| KV write failed | `503` |

## Fail-closed properties

- **Unconfigured = 404.** With no `INTAKE_PATH` secret the Worker answers 404,
  exactly like an unknown host. An unconfigured receiver never implies a stored
  request.
- **Store before acknowledge.** The KV write happens before the 200. If it
  fails, the request is rejected, so the site can never report a receipt it
  cannot back.
- **Notification is best-effort.** A mail failure after a durable write does not
  fail the request.
- **Privacy.** The durable record lives in a private KV namespace keyed by an
  opaque id (`OPP-...`). Only the notification email, sent to the verified team
  address `support@conxian-labs.com`, carries the contact details.

## Configuration

| Binding | Value |
|---------|-------|
| Route | `intake.conxian-labs.com/*` (zone `conxian-labs.com`, needs a proxied placeholder record) |
| KV `LEADS` | namespace `conxian-intake-leads` |
| `send_email` `EMAIL` | destination `support@conxian-labs.com` (a verified Email Routing address) |
| Secret `INTAKE_PATH` | the path segment the site relays to |

Set the site to relay here:

```
ACCESS_REQUEST_ENDPOINT=https://intake.conxian-labs.com/<INTAKE_PATH>
```

Deploy:

```sh
npx wrangler deploy --config infra/intake-worker/wrangler.jsonc
npx wrangler secret put INTAKE_PATH --config infra/intake-worker/wrangler.jsonc
```

## Reading leads

```sh
npx wrangler kv key list --binding LEADS --config infra/intake-worker/wrangler.jsonc
npx wrangler kv key get "lead:OPP-..." --binding LEADS --config infra/intake-worker/wrangler.jsonc
```

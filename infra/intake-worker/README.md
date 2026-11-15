# Access-request intake receiver

A restricted receiver for the public site's gated access-request form. It is the
"restricted system, never Git" that `ACCESS_REQUEST_ENDPOINT` points at (see
`render.yaml` and `.env.example`). It implements the intake path decided in
`conxian-business` #2059: the site relays a submission server-to-server to this
receiver, which records a tracked lead under an opaque opportunity id, opens a
sanitized `lifecycle:lead` issue in `conxian-business`, and notifies the team.

The site's *transport* is HTTP, never Git: the browser and the site never touch a
repository. This receiver is the restricted system that projects a sanitized,
identity-free record into the private business repository.

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

## End-to-end flow

1. A visitor submits the form on `/get-started`.
2. The site relays the payload to this receiver over HTTP.
3. The receiver stores the full record in the private KV namespace and returns
   `200` **before** any enrichment.
4. Best-effort, in order: open a sanitized `lifecycle:lead` issue in
   `Conxian/conxian-business`, then email the team at `support@conxian-labs.com`.

Step 3 is the only thing that decides the response. A failure in step 4 degrades
the enrichment, never the stored lead.

## Fail-closed properties

- **Unconfigured = 404.** With no `INTAKE_PATH` secret the Worker answers 404,
  exactly like an unknown host. An unconfigured receiver never implies a stored
  request.
- **Store before acknowledge.** The KV write happens before the 200. If it
  fails, the request is rejected, so the site can never report a receipt it
  cannot back.
- **Enrichment is best-effort.** A GitHub or mail failure after a durable write
  does not fail the request; the KV record and the team email are the fallbacks.
- **Privacy boundary.** The durable KV record holds the contact details. The
  GitHub issue carries only the opaque id, the sanitized stage, and coordination
  fields — no email, organization, or message text. The notification email (to a
  verified team address) is the only channel that carries identity to a human.

## Configuration

| Binding | Value |
|---------|-------|
| Route | `intake.conxian-labs.com/*` (zone `conxian-labs.com`, needs a proxied placeholder record) |
| KV `LEADS` | namespace `conxian-intake-leads` |
| `send_email` `EMAIL` | destination `support@conxian-labs.com` (a verified Email Routing address) |
| Secret `INTAKE_PATH` | the path segment the site relays to |
| Secret `GITHUB_TOKEN` | creates the tracked issue; scope it to Issues:write on `conxian-business` only |

Set the site to relay here:

```
ACCESS_REQUEST_ENDPOINT=https://intake.conxian-labs.com/<INTAKE_PATH>
```

Deploy:

```sh
npx wrangler deploy --config infra/intake-worker/wrangler.jsonc
npx wrangler secret put INTAKE_PATH --config infra/intake-worker/wrangler.jsonc
npx wrangler secret put GITHUB_TOKEN --config infra/intake-worker/wrangler.jsonc
```

## Reading leads

```sh
npx wrangler kv key list --binding LEADS --config infra/intake-worker/wrangler.jsonc
npx wrangler kv key get "lead:OPP-..." --binding LEADS --config infra/intake-worker/wrangler.jsonc
```

Tracked issues are `lifecycle:lead` in `Conxian/conxian-business`; the pipeline
board (#2059 item 1) is a view over those labels.

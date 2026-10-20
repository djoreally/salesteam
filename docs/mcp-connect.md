# Run SalesTeam with Muse (MCP)

SalesTeam ships a remote MCP (Model Context Protocol) server. A user signs in
to SalesTeam, creates a workspace API key, adds SalesTeam as a custom
connector in their own Muse (Meta Muse account), and their Muse can then
operate SalesTeam for them — checking connections, running certifications,
starting agent runs, reconciling products and browsing the Product Studio
catalog.

## What was built

| Piece | Location |
| --- | --- |
| API keys table | `api_keys` in `src/db/infrastructure.ts`, migration `scripts/migrate-mcp-api-keys.mjs` |
| API key library | `src/lib/auth/api-key.ts` — `createApiKey`, `resolveApiKey`, `listApiKeys`, `revokeApiKey` |
| Key management API | `src/app/api/api-keys/route.ts` (session auth; owner/admin to create/revoke) |
| MCP server | `src/lib/mcp/server.ts`, served by `src/app/api/mcp/route.ts` |
| Shared operations | `src/lib/operations.ts` — the HTTP routes and the MCP tools call the same functions |
| Settings UI | "Connect your Muse (API keys)" section on `/settings` (`src/components/api-key-manager.tsx`) |
| Connect guide | `/connect` page (`src/app/connect/page.tsx`), linked in the app nav |

The MCP layer is additive: existing routes keep their behavior. Where route
handlers previously held logic inline (runs, run detail, certification
status, providers, Product Studio catalog, settings), that logic moved into
`src/lib/operations.ts` and the routes now delegate to it, so the MCP tools
run exactly the same code — never a copy, and never an HTTP call back into
the app.

`src/proxy.ts` lets `/api/mcp` through the session-cookie gate because MCP
clients authenticate with the API key instead; the MCP route handler
enforces that auth itself on every request.

## Auth model

- Keys are per workspace (organization). Format: `st_live_` + 32 random
  bytes (base64url).
- The full key is shown **once**, in the creation response. Only the SHA-256
  hash of the full key is stored (`key_hash`), plus a short display prefix
  (`key_prefix`). Keys cannot be recovered — revoke and re-create.
- Every MCP request requires `Authorization: Bearer <key>`. Missing,
  malformed, unknown or revoked keys get HTTP 401 with a JSON-RPC error
  body (`code: -32001`). Resolution fails closed: a database error also
  resolves to 401.
- Tenancy is bound to the key. A fresh MCP server is created per request for
  the key's organization only; tools accept **no** organization parameter,
  so a key can never reach another workspace.
- Only workspace owners/admins can create or revoke keys (session API).
  Creating a key is therefore the act of delegation: the key acts for the
  workspace with the same reach as the MCP tools below.
- `last_used_at` is updated on each authenticated MCP request. Revoking a
  key (`revoked_at`) stops it immediately.
- Tool output never includes provider credentials or secrets:
  `salesteam_get_settings` returns workspace defaults only, filtering out
  encrypted settings and any key that looks like a secret/token/password.

## Transport

Remote MCP over Streamable HTTP (official `@modelcontextprotocol/sdk`,
web-standard transport), stateless mode, JSON responses. Endpoint:

```
POST|GET|DELETE  /api/mcp
Authorization: Bearer st_live_…
```

## Tools

All tools are prefixed `salesteam_` and return JSON as text content; errors
are returned as clean `isError` messages (no stack traces, no secrets).

| Tool | What it does |
| --- | --- |
| `salesteam_list_runs` | The workspace's 25 most recent runs. |
| `salesteam_get_run` | One run in full: steps, opportunities, products, listings, API calls, summary. |
| `salesteam_start_run` | Start a run from a `goal`, optionally restricted to `channels` (provider ids). Same validation as `POST /api/runs`: at least one authorized sales channel and one POD provider, then `executeGoal`. |
| `salesteam_list_connections` | Provider connections and their state for the workspace. |
| `salesteam_list_providers` | Registry descriptors for every provider plus this workspace's connection/credential state. |
| `salesteam_certification_status` | Commerce Core v1 milestone status (the `GET /api/certify` view). |
| `salesteam_certify_connection` | Run the live certification probe suite for one `providerId` (the `POST /api/certify` action). Alias: `salesteam_run_certification`. |
| `salesteam_verify_receipt` | Certification security status and receipt-verification framework state; optionally checks a receipt JSON string. |
| `salesteam_reconcile` | Reconcile one master product (`productId`) against its channel listings. |
| `salesteam_browse_catalog` | Live Printify/Printful catalog via the workspace's credentials (Product Studio): list, product detail, and Printify variant detail. |
| `salesteam_get_settings` | Workspace profile + commerce defaults (secrets filtered out). |

The server also sends an MCP `instructions` brief describing SalesTeam, the
tools in plain words, and example workflows, so a freshly connected Muse
knows how to operate the workspace.

## User-facing connect steps

1. Sign in to SalesTeam → **Settings** → **Connect your Muse (API keys)** →
   create a key and copy it (shown once).
2. In Muse, add a **custom connector** and paste the MCP endpoint URL —
   `<your SalesTeam origin>/api/mcp`. The `/connect` page renders the exact
   URL for the current deployment with a copy button.
3. When Muse asks to authenticate, paste the API key as the bearer token.
4. Try an example prompt (the `/connect` page lists copyable ones):
   - "Check my connections, then certify Printify"
   - "Start a run with goal X on my connected channels"
   - "Show my last run and its steps"
   - "Browse the Printify catalog in SalesTeam Product Studio"

## Running the migration

Migration scripts in this repo are run manually against the target database
(the build script runs only `migrate-update8-vault-hardening.mjs`). Run once
per environment, before deploying this branch:

```bash
DATABASE_URL=<neon connection string> node scripts/migrate-mcp-api-keys.mjs
```

It creates the `api_keys` table and indexes idempotently
(`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).

# SalesTeam

Unified commerce agent and certification control plane.

## Local development

```bash
npm install
npm run dev
```

## Run it with Muse (MCP)

SalesTeam includes a remote MCP server at `/api/mcp`. Create a workspace API
key in Settings, add SalesTeam as a custom connector in your Muse, paste
the key, and your Muse can operate your workspace — connections,
certifications, runs, reconciliation and the Product Studio catalog. Full
guide, auth model and tool list: [docs/mcp-connect.md](docs/mcp-connect.md).
One-time database setup: `DATABASE_URL=… node scripts/migrate-mcp-api-keys.mjs`.

## Production

Designed for Next.js deployment on Vercel. Configure `DATABASE_URL` and only the provider credentials you intend to enable.

Deployment source: GitHub `main` → Vercel production.

Production database: Neon PostgreSQL.

Schema initialization: Drizzle against Neon.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveApiKey } from "@/lib/auth/api-key";
import { createMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SalesTeam MCP server (remote, Streamable HTTP, stateless).
 *
 * Auth: `Authorization: Bearer <workspace API key>` on every request.
 * The key resolves to exactly one organization; a fresh MCP server is built
 * per request bound to that organization. No session cookie is involved —
 * src/proxy.ts lets this path through and this handler enforces auth itself.
 */

function unauthorized() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: a valid SalesTeam API key is required (Authorization: Bearer st_live_…).",
      },
      id: null,
    },
    { status: 401 },
  );
}

async function handle(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const resolved = await resolveApiKey(token);
  if (!resolved) return unauthorized();

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const server = createMcpServer(resolved.organizationId, origin);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

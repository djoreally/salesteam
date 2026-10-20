import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/auth/api-key";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Workspace API key management for the MCP integration.
 * Session-authenticated; creating and revoking keys requires owner/admin.
 * The full key is returned exactly once, in the POST response.
 */

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await listApiKeys(session.organizationId);
  return Response.json({ keys });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.membershipRole)) {
    return Response.json({ error: "Workspace owner or admin access is required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim();
  if (name.length > 80) return Response.json({ error: "name must be 80 characters or fewer" }, { status: 400 });

  const created = await createApiKey(session.organizationId, name || "Muse");
  return Response.json({ key: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.membershipRole)) {
    return Response.json({ error: "Workspace owner or admin access is required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: number };
  const queryId = new URL(req.url).searchParams.get("id");
  const id = Number(body.id ?? (queryId ? Number(queryId) : NaN));
  if (!Number.isFinite(id) || id <= 0) return Response.json({ error: "valid key id is required" }, { status: 400 });

  const revoked = await revokeApiKey(session.organizationId, id);
  if (!revoked) return Response.json({ error: "Key not found or already revoked" }, { status: 404 });
  return Response.json({ ok: true });
}

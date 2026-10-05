import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { PROVIDERS } from "@/lib/commerce/registry";
import { credentialStatus } from "@/lib/credentials/vault";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const conns = await ensureConnections(session.organizationId);
  const byId = new Map(conns.map((c) => [c.providerId, c]));
  const credentialStatuses = await Promise.all(PROVIDERS.map((p) => credentialStatus(session.organizationId, p.id)));
  const credentialsById = new Map(credentialStatuses.map((status) => [status.providerId, status]));

  return Response.json({
    providers: PROVIDERS.map((p) => {
      const connection = byId.get(p.id) ?? null;
      const credential = credentialsById.get(p.id);
      return {
        ...p,
        mode: connection?.mode ?? "sandbox",
        missingEnv: credential?.missing ?? p.envKeys,
        adapter: BESPOKE_ADAPTERS.includes(p.id) ? "bespoke" : "generic",
        connection,
      };
    }),
  });
}

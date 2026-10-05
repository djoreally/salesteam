import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { missingCredentials, providerMode } from "@/lib/commerce/control-plane";
import { PROVIDERS } from "@/lib/commerce/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const conns = await ensureConnections(session.organizationId);
  const byId = new Map(conns.map((c) => [c.providerId, c]));

  return Response.json({
    providers: PROVIDERS.map((p) => ({
      ...p,
      mode: providerMode(p.id),
      missingEnv: missingCredentials(p.id),
      adapter: BESPOKE_ADAPTERS.includes(p.id) ? "bespoke" : "generic",
      connection: byId.get(p.id) ?? null,
    })),
  });
}

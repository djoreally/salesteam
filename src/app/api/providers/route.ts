import { missingCredentials, providerMode } from "@/lib/commerce/control-plane";
import { PROVIDERS } from "@/lib/commerce/registry";
import { ensureConnections } from "@/lib/bootstrap";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";

export const dynamic = "force-dynamic";

export async function GET() {
  const conns = await ensureConnections();
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

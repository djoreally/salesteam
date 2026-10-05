import { db } from "@/db";
import { connections, providerCertifications } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_TRANSITIONS: Record<string, string[]> = {
  registered: ["connected"],
  connected: ["registered", "certified"],
  certified: ["connected", "production_enabled"],
  production_enabled: ["certified", "connected", "registered"],
};

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await ensureConnections(session.organizationId);
  return Response.json({ connections: rows });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.membershipRole)) {
    return Response.json({ error: "Workspace owner or admin access is required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { providerId?: string; state?: string };
  if (!body.providerId || !body.state) {
    return Response.json({ error: "providerId and state are required" }, { status: 400 });
  }

  await ensureConnections(session.organizationId);
  const scope = and(
    eq(connections.organizationId, session.organizationId),
    eq(connections.providerId, body.providerId),
  );
  const [current] = await db.select().from(connections).where(scope);
  if (!current) return Response.json({ error: "Provider not registered" }, { status: 404 });

  const allowed = VALID_TRANSITIONS[current.state as string] ?? [];
  if (!allowed.includes(body.state)) {
    return Response.json(
      { error: `Invalid transition: ${current.state} → ${body.state}. Allowed: ${allowed.join(", ")}` },
      { status: 403 },
    );
  }

  if (body.state === "connected" && !current.credentialsPresent) {
    return Response.json(
      { error: "Save all required provider credentials before connecting." },
      { status: 400 },
    );
  }

  if (body.state === "certified" || body.state === "production_enabled") {
    const [cert] = await db
      .select()
      .from(providerCertifications)
      .where(
        and(
          eq(providerCertifications.organizationId, session.organizationId),
          eq(providerCertifications.providerId, body.providerId),
        ),
      );
    if (!cert || !cert.certified) {
      return Response.json(
        { error: "Full provider certification is required before certified or production_enabled state." },
        { status: 403 },
      );
    }
  }

  await db
    .update(connections)
    .set({
      state: body.state as typeof connections.$inferInsert.state,
      mode: body.state === "production_enabled" ? "live" : "sandbox",
      updatedAt: new Date(),
      productionEnabledAt: body.state === "production_enabled" ? new Date() : current.productionEnabledAt,
      certifiedAt: body.state === "certified" ? new Date() : current.certifiedAt,
    })
    .where(scope);

  const rows = await db
    .select()
    .from(connections)
    .where(eq(connections.organizationId, session.organizationId));
  return Response.json({ connections: rows });
}

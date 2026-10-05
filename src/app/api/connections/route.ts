import { db } from "@/db";
import { connections, providerCertifications } from "@/db/schema";
import { ensureConnections } from "@/lib/bootstrap";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* Valid state-machine transitions.
 * The only way to advance is through the certification engine,
 * not through direct API assignment.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  registered: ["connected"],
  connected: ["registered", "certified"],
  certified: ["connected", "production_enabled"],
  production_enabled: ["certified", "connected", "registered"],
};

export async function GET() {
  const rows = await ensureConnections();
  return Response.json({ connections: rows });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { providerId?: string; state?: string };
  if (!body.providerId || !body.state) {
    return Response.json({ error: "providerId and state are required" }, { status: 400 });
  }
  await ensureConnections();

  // Read current state
  const [current] = await db.select().from(connections).where(eq(connections.providerId, body.providerId));
  if (!current) {
    return Response.json({ error: "Provider not registered" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[current.state as string] ?? [];
  if (!allowed.includes(body.state)) {
    return Response.json(
      { error: `Invalid transition: ${current.state} → ${body.state}. Allowed: ${allowed.join(", ")}` },
      { status: 403 },
    );
  }

  // Certification gate: certified → production_enabled requires cert record
  if (body.state === "production_enabled" && current.state !== "production_enabled") {
    const [cert] = await db.select().from(providerCertifications).where(eq(providerCertifications.providerId, body.providerId));
    if (!cert || !cert.certified) {
      return Response.json(
        { error: "Certification required before production_enabled. Provider must pass full test suite." },
        { status: 403 },
      );
    }
  }

  await db
    .update(connections)
    .set({
      state: body.state as typeof connections.$inferInsert.state,
      updatedAt: new Date(),
      productionEnabledAt: body.state === "production_enabled" ? new Date() : current.productionEnabledAt,
      certifiedAt: body.state === "certified" ? new Date() : current.certifiedAt,
    })
    .where(eq(connections.providerId, body.providerId));

  const rows = await db.select().from(connections);
  return Response.json({ connections: rows });
}

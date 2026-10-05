import { db } from "@/db";
import { connections, providerCertifications } from "@/db/schema";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { PROVIDERS } from "@/lib/commerce/registry";
import { and, eq } from "drizzle-orm";

export async function ensureConnections(organizationId: number) {
  const existing = await db.select().from(connections).where(eq(connections.organizationId, organizationId));
  const have = new Set(existing.map((c) => c.providerId));
  const missing = PROVIDERS.filter((p) => !have.has(p.id));

  if (missing.length) {
    await db.insert(connections).values(
      missing.map((p) => ({
        organizationId,
        providerId: p.id,
        label: p.name,
        state: "registered" as const,
        mode: "sandbox" as const,
        scopes: p.scopes,
        credentialsPresent: false,
        shopRef: null,
      })),
    );
  }

  return db.select().from(connections).where(eq(connections.organizationId, organizationId));
}

export async function authorizedChannels(organizationId: number) {
  const rows = await ensureConnections(organizationId);
  return rows
    .filter((r) => r.state === "production_enabled" || r.state === "certified")
    .map((r) => r.providerId);
}

export async function ensureCertifications(organizationId: number) {
  const existing = await db
    .select()
    .from(providerCertifications)
    .where(eq(providerCertifications.organizationId, organizationId));
  const have = new Set(existing.map((c) => c.providerId));
  const bespoke = BESPOKE_ADAPTERS.filter((id: string) => !have.has(id));

  if (bespoke.length) {
    await db.insert(providerCertifications).values(
      bespoke.map((id: string) => ({
        organizationId,
        providerId: id,
        adapterType: "bespoke",
        certified: false,
        testsPassed: 0,
        testsTotal: 12,
        notes: "Requires full closed-loop certification before production enabled.",
      })),
    );
  }

  return db
    .select()
    .from(providerCertifications)
    .where(eq(providerCertifications.organizationId, organizationId));
}

export async function getWorkspaceConnection(organizationId: number, providerId: string) {
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.organizationId, organizationId), eq(connections.providerId, providerId)));
  return row ?? null;
}

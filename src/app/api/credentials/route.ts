import { db } from "@/db";
import { connections } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { PROVIDERS } from "@/lib/commerce/registry";
import { clearProviderCredentials, credentialStatus, saveProviderCredentials } from "@/lib/credentials/vault";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const requested = new URL(req.url).searchParams.get("providerId");
  const providers = requested ? PROVIDERS.filter((p) => p.id === requested) : PROVIDERS;
  const statuses = await Promise.all(providers.map((p) => credentialStatus(session.organizationId, p.id)));
  return Response.json({ credentials: statuses });
}

export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { providerId?: string; secrets?: Record<string, string> };
  if (!body.providerId || !body.secrets || typeof body.secrets !== "object") {
    return Response.json({ error: "providerId and secrets are required" }, { status: 400 });
  }

  const provider = PROVIDERS.find((p) => p.id === body.providerId);
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 404 });

  await ensureConnections(session.organizationId);
  try {
    const status = await saveProviderCredentials({
      organizationId: session.organizationId,
      userId: session.userId,
      providerId: body.providerId,
      secrets: body.secrets,
    });

    await db
      .update(connections)
      .set({ credentialsPresent: status.complete, updatedAt: new Date() })
      .where(
        and(
          eq(connections.organizationId, session.organizationId),
          eq(connections.providerId, body.providerId),
        ),
      );

    return Response.json({ ok: true, credential: status });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { providerId?: string };
  if (!body.providerId) return Response.json({ error: "providerId is required" }, { status: 400 });

  const provider = PROVIDERS.find((p) => p.id === body.providerId);
  if (!provider) return Response.json({ error: "Unknown provider" }, { status: 404 });

  const status = await clearProviderCredentials(session.organizationId, body.providerId);
  await db
    .update(connections)
    .set({ credentialsPresent: false, state: "registered", mode: "sandbox", updatedAt: new Date() })
    .where(
      and(
        eq(connections.organizationId, session.organizationId),
        eq(connections.providerId, body.providerId),
      ),
    );

  return Response.json({ ok: true, credential: status });
}

import { db } from "@/db";
import { runs } from "@/db/schema";
import { executeGoal } from "@/lib/agent/orchestrator";
import { getCurrentSession } from "@/lib/auth/session";
import { authorizedChannels } from "@/lib/bootstrap";
import { POD_PROVIDERS } from "@/lib/commerce/registry";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(runs)
    .where(eq(runs.organizationId, session.organizationId))
    .orderBy(desc(runs.id))
    .limit(25);
  return Response.json({ runs: rows });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { goal?: string; channels?: string[] };
  const goal = (body.goal ?? "").trim();
  if (!goal) return Response.json({ error: "goal is required" }, { status: 400 });

  const authorized = await authorizedChannels(session.organizationId);
  const requested = body.channels?.length ? body.channels.filter((c) => authorized.includes(c)) : authorized;

  const podProviders = requested.filter((c) => POD_PROVIDERS.includes(c));
  const salesChannels = requested.filter((c) => !POD_PROVIDERS.includes(c));

  if (!salesChannels.length) {
    return Response.json({ error: "Authorize at least one sales channel first" }, { status: 400 });
  }
  if (!podProviders.length) {
    return Response.json({ error: "Authorize at least one fulfillment (POD) provider first" }, { status: 400 });
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const runId = await executeGoal({
    organizationId: session.organizationId,
    goal,
    channels: salesChannels,
    podProviders,
    origin,
  });
  return Response.json({ runId });
}

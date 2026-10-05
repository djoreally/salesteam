import { db } from "@/db";
import { runs } from "@/db/schema";
import { executeGoal } from "@/lib/agent/orchestrator";
import { authorizedChannels } from "@/lib/bootstrap";
import { POD_PROVIDERS } from "@/lib/commerce/registry";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const rows = await db.select().from(runs).orderBy(desc(runs.id)).limit(25);
  return Response.json({ runs: rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { goal?: string; channels?: string[] };
  const goal = (body.goal ?? "").trim();
  if (!goal) return Response.json({ error: "goal is required" }, { status: 400 });

  const authorized = await authorizedChannels();
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

  const runId = await executeGoal({ goal, channels: salesChannels, podProviders, origin });
  return Response.json({ runId });
}

import { db } from "@/db";
import { orders } from "@/db/schema";
import { fulfillPending, optimize, simulateMarket } from "@/lib/agent/operate";
import { getCurrentSession } from "@/lib/auth/session";
import { count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const organizationId = session.organizationId;

  switch (body.action) {
    case "simulate": {
      const [{ value }] = await db
        .select({ value: count() })
        .from(orders)
        .where(eq(orders.organizationId, organizationId));
      const res = await simulateMarket(organizationId, value + 1);
      return Response.json({ action: "simulate", ...res });
    }
    case "fulfill": {
      const res = await fulfillPending(organizationId);
      return Response.json({ action: "fulfill", fulfilled: res.length, routes: res });
    }
    case "optimize": {
      const res = await optimize(organizationId);
      return Response.json({ action: "optimize", decisions: res });
    }
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}

import { db } from "@/db";
import { orders } from "@/db/schema";
import { fulfillPending, optimize, simulateMarket } from "@/lib/agent/operate";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  switch (body.action) {
    case "simulate": {
      const [{ value }] = await db.select({ value: count() }).from(orders);
      const res = await simulateMarket(value + 1);
      return Response.json({ action: "simulate", ...res });
    }
    case "fulfill": {
      const res = await fulfillPending();
      return Response.json({ action: "fulfill", fulfilled: res.length, routes: res });
    }
    case "optimize": {
      const res = await optimize();
      return Response.json({ action: "optimize", decisions: res });
    }
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}

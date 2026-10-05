import { db } from "@/db";
import { apiCalls, listings, opportunities, products, runSteps, runs } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runId = Number(id);
  if (!Number.isFinite(runId)) return Response.json({ error: "bad id" }, { status: 400 });

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) return Response.json({ error: "not found" }, { status: 404 });

  const steps = await db.select().from(runSteps).where(eq(runSteps.runId, runId)).orderBy(asc(runSteps.idx));
  const opps = await db.select().from(opportunities).where(eq(opportunities.runId, runId)).orderBy(desc(opportunities.score));
  const prods = await db.select().from(products).where(eq(products.runId, runId));
  const calls = await db.select().from(apiCalls).where(eq(apiCalls.runId, runId)).orderBy(asc(apiCalls.id));
  const lists = prods.length
    ? await db.select().from(listings).where(eq(listings.productId, prods[0].id))
    : [];

  return Response.json({ run, steps, opportunities: opps, products: prods, listings: lists, apiCalls: calls });
}

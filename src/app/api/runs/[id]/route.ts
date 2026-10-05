import { db } from "@/db";
import { apiCalls, listings, opportunities, products, runSteps, runs } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { and, asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isFinite(runId)) return Response.json({ error: "bad id" }, { status: 400 });

  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.organizationId, session.organizationId), eq(runs.id, runId)));
  if (!run) return Response.json({ error: "not found" }, { status: 404 });

  const [steps, opps, prods, calls] = await Promise.all([
    db.select().from(runSteps).where(and(eq(runSteps.organizationId, session.organizationId), eq(runSteps.runId, runId))).orderBy(asc(runSteps.idx)),
    db.select().from(opportunities).where(and(eq(opportunities.organizationId, session.organizationId), eq(opportunities.runId, runId))).orderBy(desc(opportunities.score)),
    db.select().from(products).where(and(eq(products.organizationId, session.organizationId), eq(products.runId, runId))),
    db.select().from(apiCalls).where(and(eq(apiCalls.organizationId, session.organizationId), eq(apiCalls.runId, runId))).orderBy(asc(apiCalls.id)),
  ]);

  const lists = prods.length
    ? await db.select().from(listings).where(and(eq(listings.organizationId, session.organizationId), eq(listings.productId, prods[0].id)))
    : [];

  return Response.json({ run, steps, opportunities: opps, products: prods, listings: lists, apiCalls: calls });
}

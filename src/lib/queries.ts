import { db } from "@/db";
import { apiCalls, decisions, fulfillments, listings, orders, products, runs } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getDashboard(organizationId: number) {
  const [runRows, productRows, listingRows, orderRows, fulfillmentRows, decisionRows, callRows] = await Promise.all([
    db.select().from(runs).where(eq(runs.organizationId, organizationId)).orderBy(desc(runs.id)).limit(8),
    db.select().from(products).where(eq(products.organizationId, organizationId)).orderBy(desc(products.id)).limit(50),
    db.select().from(listings).where(eq(listings.organizationId, organizationId)).orderBy(desc(listings.id)).limit(400),
    db.select().from(orders).where(eq(orders.organizationId, organizationId)).orderBy(desc(orders.id)).limit(200),
    db.select().from(fulfillments).where(eq(fulfillments.organizationId, organizationId)).orderBy(desc(fulfillments.id)).limit(200),
    db.select().from(decisions).where(eq(decisions.organizationId, organizationId)).orderBy(desc(decisions.id)).limit(40),
    db.select().from(apiCalls).where(eq(apiCalls.organizationId, organizationId)).orderBy(desc(apiCalls.id)).limit(60),
  ]);

  const revenue = orderRows.reduce((a, o) => a + o.revenue, 0);
  const profit = orderRows.reduce((a, o) => a + o.profit, 0);
  const units = orderRows.reduce((a, o) => a + o.quantity, 0);
  const liveListings = listingRows.filter((l) => l.status === "published");

  const byChannel = new Map<string, { revenue: number; profit: number; units: number; listings: number }>();
  for (const listing of listingRows) {
    const current = byChannel.get(listing.providerId) ?? { revenue: 0, profit: 0, units: 0, listings: 0 };
    current.listings += listing.status === "published" ? 1 : 0;
    byChannel.set(listing.providerId, current);
  }
  for (const order of orderRows) {
    const current = byChannel.get(order.providerId) ?? { revenue: 0, profit: 0, units: 0, listings: 0 };
    current.revenue += order.revenue;
    current.profit += order.profit;
    current.units += order.quantity;
    byChannel.set(order.providerId, current);
  }

  const byProduct = productRows.map((product) => {
    const productOrders = orderRows.filter((o) => o.productId === product.id);
    const productListings = listingRows.filter((l) => l.productId === product.id);
    const productRevenue = productOrders.reduce((a, o) => a + o.revenue, 0);
    const productProfit = productOrders.reduce((a, o) => a + o.profit, 0);
    return {
      product,
      listings: productListings,
      units: productOrders.reduce((a, o) => a + o.quantity, 0),
      revenue: productRevenue,
      profit: productProfit,
      margin: productRevenue ? productProfit / productRevenue : 0,
    };
  });

  return {
    runs: runRows,
    products: productRows,
    listings: listingRows,
    orders: orderRows,
    fulfillments: fulfillmentRows,
    decisions: decisionRows,
    apiCalls: callRows,
    kpis: {
      revenue,
      profit,
      units,
      margin: revenue ? profit / revenue : 0,
      liveListings: liveListings.length,
      channels: new Set(liveListings.map((l) => l.providerId)).size,
      products: productRows.filter((p) => p.status === "live").length,
      apiCalls: callRows.length,
    },
    byChannel: Array.from(byChannel.entries())
      .map(([providerId, values]) => ({ providerId, ...values }))
      .sort((a, b) => b.revenue - a.revenue || b.listings - a.listings),
    byProduct: byProduct.sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getProductDetail(organizationId: number, id: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.organizationId, organizationId), eq(products.id, id)));
  if (!product) return null;

  return {
    product,
    listings: await db
      .select()
      .from(listings)
      .where(and(eq(listings.organizationId, organizationId), eq(listings.productId, id))),
    orders: await db
      .select()
      .from(orders)
      .where(and(eq(orders.organizationId, organizationId), eq(orders.productId, id))),
  };
}

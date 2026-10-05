import { db } from "@/db";
import { decisions, fulfillments, listings, orders, products, variants } from "@/db/schema";
import { commerce } from "@/lib/commerce/control-plane";
import { getProvider, PROVIDER_MAP } from "@/lib/commerce/registry";
import type { NormalizedProduct } from "@/lib/commerce/types";
import { and, eq, inArray } from "drizzle-orm";
import { hash } from "./research";

const CHANNEL_TRAFFIC: Record<string, number> = {
  etsy: 1.0,
  ebay: 0.85,
  amazon: 1.4,
  walmart: 0.7,
  tiktok: 1.15,
  shopify: 0.45,
  woocommerce: 0.3,
  square: 0.25,
  bigcommerce: 0.3,
  wix: 0.25,
  ecwid: 0.2,
  mercadolibre: 0.6,
  allegro: 0.5,
  google_merchant: 0.35,
  meta_commerce: 0.4,
  pinterest: 0.3,
};

const FIRST_NAMES = ["Dana", "Marcus", "Priya", "Luis", "Hana", "Theo", "Nina", "Omar", "Elle", "Jonas"];
const CITIES = ["Philadelphia PA", "Austin TX", "Portland OR", "Chicago IL", "Tampa FL", "Denver CO", "Columbus OH"];

/** Simulate one market tick: traffic → conversions → paid orders. */
export async function simulateMarket(tick = 1) {
  const live = await db
    .select()
    .from(listings)
    .where(eq(listings.status, "published"));

  const salesListings = live.filter((l) => PROVIDER_MAP[l.providerId] && PROVIDER_MAP[l.providerId].kind !== "pod");
  if (!salesListings.length) return { created: 0, orders: [] as number[] };

  const productIds = Array.from(new Set(salesListings.map((l) => l.productId)));
  const prodRows = await db.select().from(products).where(inArray(products.id, productIds));
  const varRows = await db.select().from(variants).where(inArray(variants.productId, productIds));

  const createdIds: number[] = [];

  for (const listing of salesListings) {
    const product = prodRows.find((p) => p.id === listing.productId);
    if (!product || product.status === "killed") continue;

    const traffic = CHANNEL_TRAFFIC[listing.providerId] ?? 0.3;
    const priceFactor = Math.max(0.35, 1.7 - listing.price / 40);
    const seed = hash(`${listing.id}:${tick}:${product.slug}`);
    const roll = (seed % 1000) / 1000;
    const expected = traffic * priceFactor * 2.1;
    const units = Math.floor(expected) + (roll < expected % 1 ? 1 : 0);
    if (units <= 0) continue;

    const pv = varRows.filter((v) => v.productId === product.id);
    const variant = pv[seed % Math.max(pv.length, 1)] ?? null;
    const fee = Number((listing.price * getProvider(listing.providerId).feeRate).toFixed(2));
    const goods = Number((product.unitCost + product.shippingCost).toFixed(2));
    const revenue = Number((listing.price * units).toFixed(2));
    const profit = Number((revenue - (goods + fee) * units).toFixed(2));

    const [row] = await db
      .insert(orders)
      .values({
        externalId: `${listing.providerId.slice(0, 3).toUpperCase()}-${seed % 900000 + 100000}`,
        providerId: listing.providerId,
        productId: product.id,
        variantId: variant?.id ?? null,
        sku: variant?.sku ?? product.slug.toUpperCase(),
        quantity: units,
        revenue,
        goodsCost: Number((goods * units).toFixed(2)),
        channelFee: Number((fee * units).toFixed(2)),
        shipping: 0,
        profit,
        customer: {
          name: `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${String.fromCharCode(65 + (seed % 26))}.`,
          city: CITIES[seed % CITIES.length],
          country: "US",
        },
        status: "paid",
      })
      .returning();
    createdIds.push(row.id);
  }

  return { created: createdIds.length, orders: createdIds };
}

/** Route every paid order to the right manufacturer and push tracking back. */
export async function fulfillPending() {
  const paid = await db.select().from(orders).where(eq(orders.status, "paid"));
  const results: { orderId: number; pod: string; tracking: string }[] = [];

  for (const order of paid) {
    const [product] = await db.select().from(products).where(eq(products.id, order.productId));
    if (!product) continue;
    const pod = (product.blueprint?.provider as string) ?? "printify";
    const tracking = `9400${hash(`${order.id}:${order.externalId}`) % 10000000000}`;

    const podRes = await commerce.fulfillOrder(pod, order.externalId, tracking, {});
    await db.insert(fulfillments).values({
      orderId: order.id,
      providerId: pod,
      externalId: podRes.fulfillment.externalId,
      status: "in_production",
      carrier: podRes.fulfillment.carrier,
      tracking,
      cost: Number((product.unitCost + product.shippingCost).toFixed(2)),
    });

    // Push tracking back to the sales channel so the buyer sees it.
    await commerce.fulfillOrder(order.providerId, order.externalId, tracking, {});
    await db.update(orders).set({ status: "fulfilled" }).where(eq(orders.id, order.id));
    results.push({ orderId: order.id, pod, tracking });
  }

  return results;
}

export interface OptimizationOutcome {
  productId: number;
  title: string;
  action: string;
  reason: string;
  before: number;
  after: number;
}

/** Reprice winners, rescue thin-margin SKUs, kill the dead ones. */
export async function optimize(): Promise<OptimizationOutcome[]> {
  const prodRows = await db.select().from(products);
  const orderRows = await db.select().from(orders);
  const listRows = await db.select().from(listings);
  const out: OptimizationOutcome[] = [];

  for (const product of prodRows) {
    if (product.status === "killed") continue;
    const mine = orderRows.filter((o) => o.productId === product.id);
    const units = mine.reduce((a, o) => a + o.quantity, 0);
    const revenue = mine.reduce((a, o) => a + o.revenue, 0);
    const profit = mine.reduce((a, o) => a + o.profit, 0);
    const margin = revenue > 0 ? profit / revenue : 0;
    const ageHours = (Date.now() - new Date(product.createdAt).getTime()) / 3_600_000;

    let action = "hold";
    let reason = `${units} units · ${(margin * 100).toFixed(1)}% net margin — inside tolerance band`;
    let multiplier = 1;

    if (units === 0 && orderRows.length > 0) {
      action = "kill";
      reason = `Zero units after ${ageHours.toFixed(1)}h of live traffic while other SKUs converted — unpublishing to stop channel-fee drag`;
    } else if (units === 0) {
      action = "hold";
      reason = "No traffic cycle has run yet — holding until the first market tick produces data";
    } else if (margin < 0.2) {
      action = "raise_price";
      reason = `Net margin ${(margin * 100).toFixed(1)}% below 20% floor — lifting price 8%`;
      multiplier = 1.08;
    } else if (units >= 6 && margin > 0.45) {
      action = "scale";
      reason = `${units} units at ${(margin * 100).toFixed(1)}% margin — testing +6% price, demand is inelastic here`;
      multiplier = 1.06;
    } else if (units <= 1 && margin > 0.5) {
      action = "lower_price";
      reason = `Only ${units} unit(s) but ${(margin * 100).toFixed(1)}% margin headroom — cutting 7% to buy velocity`;
      multiplier = 0.93;
    }

    const before = product.price;
    let after = before;

    if (action === "kill") {
      const mineListings = listRows.filter((l) => l.productId === product.id && l.status === "published");
      for (const l of mineListings) {
        const normalized = { slug: product.slug } as unknown as NormalizedProduct;
        await commerce.unpublish(l.providerId, normalized, l.externalId ?? "", {});
        await db.update(listings).set({ status: "unpublished" }).where(eq(listings.id, l.id));
      }
      await db.update(products).set({ status: "killed" }).where(eq(products.id, product.id));
    } else if (multiplier !== 1) {
      after = Number((Math.floor(before * multiplier) + 0.99).toFixed(2));
      const mineListings = listRows.filter((l) => l.productId === product.id && l.status === "published");
      for (const l of mineListings) {
        const newPrice = Number((Math.floor(l.price * multiplier) + 0.99).toFixed(2));
        await commerce.setPrice(l.providerId, l.externalId ?? "", newPrice, {});
        await db.update(listings).set({ price: newPrice, lastSyncedAt: new Date() }).where(eq(listings.id, l.id));
      }
      await db.update(products).set({ price: after }).where(eq(products.id, product.id));
    }

    await db.insert(decisions).values({ productId: product.id, action, reason, before, after });
    out.push({ productId: product.id, title: product.title, action, reason, before, after });
  }

  return out;
}

export async function listingsForProduct(productId: number) {
  return db.select().from(listings).where(and(eq(listings.productId, productId)));
}

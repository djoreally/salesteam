import { db } from "@/db";
import { listings, products } from "@/db/schema";
import { commerce } from "@/lib/commerce/control-plane";
import { and, eq } from "drizzle-orm";

export interface ReconciliationDiff {
  providerId: string;
  externalId?: string;
  capability: string;
  desired: unknown;
  current?: unknown;
  difference?: string;
  action: string;
  result?: "success" | "failed" | "pending";
  evidence?: Record<string, unknown>;
}

export interface ReconciliationReport {
  masterProductId: number;
  masterTitle: string;
  masterPrice: number;
  differences: ReconciliationDiff[];
  actionsTaken: number;
  actionsFailed: number;
  inSync: boolean;
}

export async function reconcileMaster(organizationId: number, masterProductId: number): Promise<ReconciliationReport> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.organizationId, organizationId), eq(products.id, masterProductId)));
  if (!product) throw new Error(`Master product ${masterProductId} not found`);

  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.organizationId, organizationId), eq(listings.productId, masterProductId)));
  const differences: ReconciliationDiff[] = [];
  let actionsTaken = 0;
  let actionsFailed = 0;

  for (const listing of rows) {
    const diff: ReconciliationDiff = {
      providerId: listing.providerId,
      externalId: listing.externalId ?? undefined,
      capability: "pricing",
      desired: product.price,
      current: listing.price,
      difference: `Master price $${product.price} ≠ provider price $${listing.price}`,
      action: listing.price === product.price ? "none" : "update_price",
    };

    if (diff.action === "update_price") {
      try {
        const result = await commerce.setPrice(listing.providerId, listing.externalId ?? "", product.price, { organizationId });
        diff.result = result.ok ? "success" : "failed";
        diff.evidence = { request: result.request, response: result.data, statusCode: result.statusCode };
        if (result.ok) {
          await db
            .update(listings)
            .set({ price: product.price, lastSyncedAt: new Date() })
            .where(and(eq(listings.organizationId, organizationId), eq(listings.id, listing.id)));
          actionsTaken++;
        } else {
          actionsFailed++;
        }
      } catch {
        diff.result = "failed";
        actionsFailed++;
      }
    } else {
      diff.result = "success";
    }
    differences.push(diff);
  }

  return {
    masterProductId,
    masterTitle: product.title,
    masterPrice: product.price,
    differences,
    actionsTaken,
    actionsFailed,
    inSync: actionsFailed === 0 && differences.every((d) => d.result === "success"),
  };
}

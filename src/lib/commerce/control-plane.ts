import { db } from "@/db";
import { apiCalls } from "@/db/schema";
import { authenticateProvider, credentialsFromEnvironment, type AuthResult } from "@/lib/auth/transports";
import { getProviderCredentials } from "@/lib/credentials/vault";
import { getAdapter, type AdapterContext } from "./adapters";
import { getProvider } from "./registry";
import type { Capability, FulfillmentResult, NormalizedProduct, ProviderRequest, ProviderResult } from "./types";

export interface CallContext {
  organizationId?: number | null;
  runId?: number | null;
  shopRef?: string;
  locationId?: string;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function providerMode(providerId: string): "live" | "sandbox" {
  const provider = getProvider(providerId);
  return provider.envKeys.every((key) => Boolean(process.env[key])) ? "live" : "sandbox";
}

export function missingCredentials(providerId: string) {
  return getProvider(providerId).envKeys.filter((key) => !process.env[key]);
}

async function resolveAuth(providerId: string, ctx: CallContext): Promise<AuthResult> {
  const credentials = ctx.organizationId
    ? await getProviderCredentials(ctx.organizationId, providerId)
    : credentialsFromEnvironment(providerId);
  return authenticateProvider(providerId, credentials);
}

function adapterContext(ctx: CallContext, auth: AuthResult): AdapterContext {
  return {
    shopRef: ctx.shopRef ?? auth.shopRef ?? "{shop_id}",
    locationId: ctx.locationId ?? auth.locationId ?? "{location_id}",
  };
}

async function execute(
  providerId: string,
  capability: Capability,
  request: ProviderRequest,
  ctx: CallContext,
  auth: AuthResult,
  synth: (seed: number) => { externalId?: string; url?: string; data: Record<string, unknown> },
): Promise<ProviderResult> {
  const provider = getProvider(providerId);
  const mode: "live" | "sandbox" = auth.ok ? "live" : "sandbox";
  const started = Date.now();
  const seed = hashString(`${providerId}:${request.endpoint}:${JSON.stringify(request.body ?? {})}`) % 900000 + 100000;
  let result: ProviderResult;

  if (mode === "live") {
    try {
      const baseUrl = (auth.baseUrl ?? provider.baseUrl).replace(/\/$/, "");
      const url = `${baseUrl}${request.endpoint}`;
      const response = await fetch(url, {
        method: request.method,
        headers: {
          "content-type": "application/json",
          ...(auth.headers ?? {}),
          ...(request.headers ?? {}),
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      result = {
        ok: response.ok,
        mode,
        statusCode: response.status,
        data,
        request,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      result = {
        ok: false,
        mode,
        statusCode: 599,
        data: { error: String(error) },
        request,
        latencyMs: Date.now() - started,
        message: String(error),
      };
    }
  } else {
    const synthetic = synth(seed);
    result = {
      ok: true,
      mode,
      statusCode: request.method === "POST" ? 201 : 200,
      externalId: synthetic.externalId,
      url: synthetic.url,
      data: synthetic.data,
      request,
      latencyMs: 40 + (seed % 260),
      message: `sandbox: ${auth.error ?? "live transport unavailable"}`,
    };
  }

  await db.insert(apiCalls).values({
    organizationId: ctx.organizationId ?? null,
    runId: ctx.runId ?? null,
    providerId,
    capability,
    method: request.method,
    endpoint: request.endpoint,
    mode: result.mode,
    statusCode: result.statusCode,
    request: (request.body ?? {}) as Record<string, unknown>,
    response: result.data,
    latencyMs: result.latencyMs,
  });
  return result;
}

export const commerce = {
  async createProduct(providerId: string, product: NormalizedProduct, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    const request = adapter.createProduct(product, adapterContext(ctx, auth));
    return execute(providerId, "products.write", request, ctx, auth, (seed) => {
      const ref = adapter.identify(product, seed);
      return { externalId: ref.externalId, url: ref.url, data: { id: ref.externalId, handle: product.slug, status: "draft" } };
    });
  },

  async uploadMedia(providerId: string, product: NormalizedProduct, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "media.write", adapter.uploadMedia(product, adapterContext(ctx, auth)), ctx, auth, (seed) => ({
      externalId: `media_${seed}`,
      data: { uploaded: product.images.length, ids: product.images.map((_image, index) => `media_${seed + index}`) },
    }));
  },

  async setPrice(providerId: string, externalId: string, price: number, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "price.write", adapter.setPrice(externalId, price, adapterContext(ctx, auth)), ctx, auth, () => ({ externalId, data: { id: externalId, price } }));
  },

  async setInventory(providerId: string, externalId: string, quantity: number, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "inventory.write", adapter.setInventory(externalId, quantity, adapterContext(ctx, auth)), ctx, auth, () => ({ externalId, data: { id: externalId, available: quantity } }));
  },

  async publish(providerId: string, product: NormalizedProduct, externalId: string, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "publish", adapter.publish(externalId, adapterContext(ctx, auth)), ctx, auth, (seed) => {
      const ref = adapter.identify(product, seed);
      return { externalId, url: ref.url, data: { id: externalId, status: "published", url: ref.url } };
    });
  },

  async unpublish(providerId: string, product: NormalizedProduct, externalId: string, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "publish", adapter.unpublish(externalId, adapterContext(ctx, auth)), ctx, auth, () => ({ externalId, data: { id: externalId, status: "unpublished" } }));
  },

  async listOrders(providerId: string, ctx: CallContext = {}) {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    return execute(providerId, "orders.read", adapter.listOrders(adapterContext(ctx, auth)), ctx, auth, (seed) => ({ data: { count: seed % 4, orders: [] } }));
  },

  async fulfillOrder(providerId: string, orderRef: string, tracking: string, ctx: CallContext = {}): Promise<ProviderResult & { fulfillment: FulfillmentResult }> {
    const auth = await resolveAuth(providerId, ctx);
    const adapter = getAdapter(providerId);
    const result = await execute(providerId, "fulfillment.write", adapter.fulfillOrder(orderRef, tracking, adapterContext(ctx, auth)), ctx, auth, (seed) => ({
      externalId: `ful_${seed}`,
      data: { id: `ful_${seed}`, status: "in_production", tracking },
    }));
    return {
      ...result,
      fulfillment: {
        externalId: result.externalId ?? `ful_${orderRef}`,
        status: "in_production",
        carrier: "USPS",
        tracking,
        cost: 0,
      },
    };
  },
};

export type Commerce = typeof commerce;

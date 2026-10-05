import { db } from "@/db";
import { apiCalls, connections, providerCertifications } from "@/db/schema";
import { authenticateProvider } from "@/lib/auth/transports";
import { getAdapter, VERIFIED_REQUEST_ADAPTERS } from "@/lib/commerce/adapters";
import { getProvider } from "@/lib/commerce/registry";
import type { NormalizedProduct, ProviderRequest } from "@/lib/commerce/types";
import { getProviderCredentials } from "@/lib/credentials/vault";
import { and, eq } from "drizzle-orm";

export interface CertificationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ProviderProbeResult {
  providerId: string;
  readyForFullCertification: boolean;
  liveProbeAttempted: boolean;
  liveProbePassed: boolean;
  checks: CertificationCheck[];
  testsPassed: number;
  testsTotal: number;
}

const SAMPLE_PRODUCT: NormalizedProduct = {
  title: "SalesTeam Certification Draft",
  slug: "salesteam-certification-draft",
  description: "Temporary non-production certification fixture.",
  bullets: ["certification fixture"],
  tags: ["salesteam-certification"],
  seo: { title: "Certification Draft", description: "Certification fixture", keywords: "certification" },
  images: [{ role: "primary", url: "https://example.com/certification.jpg", alt: "Certification fixture" }],
  variants: [{ sku: "CERT-001", options: { Size: "M", variantId: "1" }, cost: 10, price: 29.99, inventory: 5 }],
  unitCost: 10,
  shippingCost: 5,
  price: 29.99,
  currency: "USD",
  blueprint: { blueprintId: 1, printProviderId: 1, category: "Certification" },
};

function validRequest(request: ProviderRequest) {
  return Boolean(request.method && request.endpoint.startsWith("/"));
}

function readProbe(providerId: string, shopRef?: string): ProviderRequest | null {
  switch (providerId) {
    case "shopify":
      return { method: "POST", endpoint: "/graphql.json", body: { query: "query { shop { id name } }" } };
    case "woocommerce":
      return { method: "GET", endpoint: "/system_status" };
    case "square":
      return { method: "GET", endpoint: "/locations" };
    case "printify":
      return { method: "GET", endpoint: "/shops.json" };
    case "printful":
      return { method: "GET", endpoint: "/stores" };
    default:
      return shopRef ? { method: "GET", endpoint: "/" } : null;
  }
}

async function executeProbe(
  organizationId: number,
  providerId: string,
  request: ProviderRequest,
  auth: ReturnType<typeof authenticateProvider>,
) {
  if (!auth.ok || !auth.baseUrl) return { ok: false, statusCode: 0, message: auth.error ?? "Authentication unavailable" };
  const started = Date.now();
  try {
    const response = await fetch(`${auth.baseUrl.replace(/\/$/, "")}${request.endpoint}`, {
      method: request.method,
      headers: { "content-type": "application/json", ...(auth.headers ?? {}), ...(request.headers ?? {}) },
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    await db.insert(apiCalls).values({
      organizationId,
      providerId,
      capability: "products.read",
      method: request.method,
      endpoint: request.endpoint,
      mode: "live",
      simulated: false,
      statusCode: response.status,
      request: (request.body ?? {}) as Record<string, unknown>,
      response: data,
      latencyMs: Date.now() - started,
      plane: "certification",
    });
    return { ok: response.ok, statusCode: response.status, message: response.ok ? "Provider read probe succeeded" : `Provider returned HTTP ${response.status}` };
  } catch (error) {
    await db.insert(apiCalls).values({
      organizationId,
      providerId,
      capability: "products.read",
      method: request.method,
      endpoint: request.endpoint,
      mode: "live",
      simulated: false,
      statusCode: 599,
      request: (request.body ?? {}) as Record<string, unknown>,
      response: { error: String(error) },
      latencyMs: Date.now() - started,
      plane: "certification",
    });
    return { ok: false, statusCode: 599, message: String(error) };
  }
}

export async function runProviderProbe(organizationId: number, providerId: string): Promise<ProviderProbeResult> {
  const provider = getProvider(providerId);
  const adapter = getAdapter(providerId);
  const credentials = await getProviderCredentials(organizationId, providerId);
  const auth = authenticateProvider(providerId, credentials);
  const [connection] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.organizationId, organizationId), eq(connections.providerId, providerId)));

  const ctx = {
    shopRef: auth.shopRef ?? connection?.shopRef ?? credentials.PRINTIFY_SHOP_ID ?? "cert-shop",
    locationId: auth.locationId ?? credentials.SQUARE_LOCATION_ID ?? "cert-location",
  };

  const structural: Array<[string, string, ProviderRequest]> = [
    ["create-product", "Product-create request is provider-specific and valid", adapter.createProduct(SAMPLE_PRODUCT, ctx)],
    ["upload-media", "Media request is provider-specific and valid", adapter.uploadMedia(SAMPLE_PRODUCT, ctx)],
    ["set-price", "Price-write request is provider-specific and valid", adapter.setPrice("cert-ref", 31.99, ctx)],
    ["set-inventory", "Inventory-write request is provider-specific and valid", adapter.setInventory("cert-ref", 7, ctx)],
    ["publish", "Publish request is provider-specific and valid", adapter.publish("cert-ref", ctx)],
    ["unpublish", "Unpublish request is provider-specific and valid", adapter.unpublish("cert-ref", ctx)],
    ["orders-read", "Order-read request is provider-specific and valid", adapter.listOrders(ctx)],
    ["fulfillment", "Fulfillment request is provider-specific and valid", adapter.fulfillOrder("cert-order", "940000000000", ctx)],
  ];

  const checks: CertificationCheck[] = [
    { id: "verified-adapter", label: "Provider has a verified request adapter", passed: VERIFIED_REQUEST_ADAPTERS.includes(providerId) },
    { id: "credentials", label: "All required workspace credentials are present", passed: provider.envKeys.every((key) => Boolean(credentials[key])), detail: provider.envKeys.filter((key) => !credentials[key]).join(", ") || undefined },
    { id: "auth", label: "Workspace credentials pass local auth transport validation", passed: auth.ok, detail: auth.error },
    { id: "connection", label: "Provider connection is at least connected", passed: Boolean(connection && ["connected", "certified", "production_enabled"].includes(connection.state)), detail: connection?.state ?? "missing" },
    ...structural.map(([id, label, request]) => ({ id, label, passed: validRequest(request), detail: `${request.method} ${request.endpoint}` })),
  ];

  const probe = readProbe(providerId, ctx.shopRef);
  let liveProbeAttempted = false;
  let liveProbePassed = false;
  if (probe && auth.ok && connection && ["connected", "certified", "production_enabled"].includes(connection.state)) {
    liveProbeAttempted = true;
    const result = await executeProbe(organizationId, providerId, probe, auth);
    liveProbePassed = result.ok;
    checks.push({ id: "live-read-probe", label: "Live authenticated provider read succeeds", passed: result.ok, detail: `${result.statusCode}: ${result.message}` });
  } else {
    checks.push({ id: "live-read-probe", label: "Live authenticated provider read succeeds", passed: false, detail: "Not attempted until credentials are complete and connection state is connected" });
  }

  const testsPassed = checks.filter((check) => check.passed).length;
  const testsTotal = checks.length;
  const readyForFullCertification = checks.every((check) => check.passed);

  const [existing] = await db
    .select()
    .from(providerCertifications)
    .where(and(eq(providerCertifications.organizationId, organizationId), eq(providerCertifications.providerId, providerId)));

  const notes = readyForFullCertification
    ? "Connectivity + adapter probe passed. Full create/readback/update/publish/unpublish/cleanup certification is still required before production enablement."
    : `Certification readiness incomplete: ${checks.filter((check) => !check.passed).map((check) => check.id).join(", ")}`;

  if (existing) {
    await db
      .update(providerCertifications)
      .set({ testsPassed, testsTotal, certified: false, certifiedAt: null, notes, updatedAt: new Date() })
      .where(eq(providerCertifications.id, existing.id));
  } else {
    await db.insert(providerCertifications).values({
      organizationId,
      providerId,
      adapterType: VERIFIED_REQUEST_ADAPTERS.includes(providerId) ? "bespoke" : "generic",
      capabilitiesCertified: [],
      testsPassed,
      testsTotal,
      certified: false,
      notes,
      updatedAt: new Date(),
    });
  }

  return { providerId, readyForFullCertification, liveProbeAttempted, liveProbePassed, checks, testsPassed, testsTotal };
}

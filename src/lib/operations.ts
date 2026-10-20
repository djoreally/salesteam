import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, settings } from "@/db/infrastructure";
import { apiCalls, listings, opportunities, products, runSteps, runs } from "@/db/schema";
import { executeGoal } from "@/lib/agent/orchestrator";
import { getImplementedCapabilities } from "@/lib/auth/certification";
import { authenticateProvider } from "@/lib/auth/transports";
import { authorizedChannels, ensureCertifications, ensureConnections } from "@/lib/bootstrap";
import { CORE_V1 } from "@/lib/certification/milestones";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { POD_PROVIDERS, PROVIDERS } from "@/lib/commerce/registry";
import { credentialStatus, getProviderCredentials } from "@/lib/credentials/vault";

/**
 * Shared workspace operations.
 *
 * These are the single implementation behind both the session-authenticated
 * HTTP API routes and the API-key-authenticated MCP tools. Routes and tools
 * must call these functions — business logic lives here exactly once.
 */

/** Error carrying the HTTP status the equivalent API route would return. */
export class OperationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ============================== RUNS ============================== */

export async function listRuns(organizationId: number, limit = 25) {
  return db
    .select()
    .from(runs)
    .where(eq(runs.organizationId, organizationId))
    .orderBy(desc(runs.id))
    .limit(limit);
}

export async function getRunDetail(organizationId: number, runId: number) {
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.organizationId, organizationId), eq(runs.id, runId)));
  if (!run) return null;

  const [steps, opps, prods, calls] = await Promise.all([
    db.select().from(runSteps).where(and(eq(runSteps.organizationId, organizationId), eq(runSteps.runId, runId))).orderBy(asc(runSteps.idx)),
    db.select().from(opportunities).where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.runId, runId))).orderBy(desc(opportunities.score)),
    db.select().from(products).where(and(eq(products.organizationId, organizationId), eq(products.runId, runId))),
    db.select().from(apiCalls).where(and(eq(apiCalls.organizationId, organizationId), eq(apiCalls.runId, runId))).orderBy(asc(apiCalls.id)),
  ]);

  const lists = prods.length
    ? await db.select().from(listings).where(and(eq(listings.organizationId, organizationId), eq(listings.productId, prods[0].id)))
    : [];

  return { run, steps, opportunities: opps, products: prods, listings: lists, apiCalls: calls };
}

export async function startRun(
  organizationId: number,
  input: { goal?: string; channels?: string[] },
  origin: string,
): Promise<number> {
  const goal = (input.goal ?? "").trim();
  if (!goal) throw new OperationError(400, "goal is required");

  const authorized = await authorizedChannels(organizationId);
  const requested = input.channels?.length ? input.channels.filter((c) => authorized.includes(c)) : authorized;

  const podProviders = requested.filter((c) => POD_PROVIDERS.includes(c));
  const salesChannels = requested.filter((c) => !POD_PROVIDERS.includes(c));

  if (!salesChannels.length) {
    throw new OperationError(400, "Authorize at least one sales channel first");
  }
  if (!podProviders.length) {
    throw new OperationError(400, "Authorize at least one fulfillment (POD) provider first");
  }

  return executeGoal({
    organizationId,
    goal,
    channels: salesChannels,
    podProviders,
    origin,
  });
}

/* ========================== CONNECTIONS =========================== */

export async function listConnections(organizationId: number) {
  return ensureConnections(organizationId);
}

export async function listProviders(organizationId: number) {
  const conns = await ensureConnections(organizationId);
  const byId = new Map(conns.map((c) => [c.providerId, c]));
  const credentialStatuses = await Promise.all(PROVIDERS.map((p) => credentialStatus(organizationId, p.id)));
  const credentialsById = new Map(credentialStatuses.map((status) => [status.providerId, status]));

  return PROVIDERS.map((p) => {
    const connection = byId.get(p.id) ?? null;
    const credential = credentialsById.get(p.id);
    return {
      ...p,
      mode: connection?.mode ?? "sandbox",
      missingEnv: credential?.missing ?? p.envKeys,
      adapter: BESPOKE_ADAPTERS.includes(p.id) ? "bespoke" : "generic",
      connection,
    };
  });
}

/* ========================= CERTIFICATION ========================== */

export async function getCertificationStatus(organizationId: number) {
  const conns = await ensureConnections(organizationId);
  const certs = await ensureCertifications(organizationId);
  const certMap = new Map(certs.map((c) => [c.providerId, c]));

  const requiredProviders = CORE_V1.requiredProviders.map((id) => {
    const conn = conns.find((c) => c.providerId === id);
    const cert = certMap.get(id);
    const implemented = getImplementedCapabilities(id);
    const certifiedCapabilities = cert?.capabilitiesCertified ?? [];
    const requiredCapabilities = CORE_V1.requiredCapabilities[id] ?? [];
    return {
      providerId: id,
      connectionState: conn?.state ?? "missing",
      adapterType: cert?.adapterType ?? "unknown",
      certified: Boolean(cert?.certified),
      testsPassed: cert?.testsPassed ?? 0,
      testsTotal: cert?.testsTotal ?? 0,
      capabilitiesImplemented: implemented.length,
      capabilitiesRequired: requiredCapabilities.length,
      capabilitiesCertified: certifiedCapabilities.length,
      missingCertifiedCapabilities: requiredCapabilities.filter((capability) => !certifiedCapabilities.includes(capability)),
      notes: cert?.notes ?? null,
    };
  });

  const milestoneCertified = requiredProviders.every((provider) => provider.certified && provider.missingCertifiedCapabilities.length === 0);
  const requirementsStatus = CORE_V1.requirements.map((req) => {
    const cert = certMap.get(req.providerId);
    const satisfied = Boolean(cert?.certified && (!req.capability || cert.capabilitiesCertified.includes(req.capability)));
    return { ...req, satisfied };
  });

  return {
    milestone: CORE_V1.id,
    name: CORE_V1.name,
    status: milestoneCertified && requirementsStatus.every((req) => !req.required || req.satisfied) ? "certified" : "pending",
    requiredProviders,
    requirementsStatus,
    zeroSimulatedInLive: true,
    zeroUnverifiedWrites: true,
  };
}

/* ====================== PRODUCT STUDIO CATALOG ==================== */

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function providerFetch(baseUrl: string, path: string, headers: Record<string, string>) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: { accept: "application/json", ...headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return data as Record<string, unknown>;
}

export interface CatalogQuery {
  providerId: string;
  productId?: string | null;
  printProviderId?: string | null;
}

export async function browseProviderCatalog(organizationId: number, query: CatalogQuery) {
  const { providerId, productId, printProviderId } = query;
  if (!["printify", "printful"].includes(providerId)) {
    throw new OperationError(400, "Product Studio currently supports Printify and Printful catalogs.");
  }

  const settingRows = await db.select().from(settings).where(eq(settings.organizationId, organizationId));
  const values = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
  const fulfillment = asList(values["commerce.fulfillment_providers"]);
  if (!fulfillment.includes(providerId)) {
    throw new OperationError(403, `${providerId} is not enabled for this workspace.`);
  }

  const credentials = await getProviderCredentials(organizationId, providerId);
  const auth = authenticateProvider(providerId, credentials);
  if (!auth.ok || !auth.baseUrl) {
    throw new OperationError(400, auth.error ?? `Connect ${providerId} first.`);
  }
  const headers = auth.headers ?? {};

  try {
    if (providerId === "printify") {
      if (productId && printProviderId) {
        const variants = await providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}/print_providers/${encodeURIComponent(printProviderId)}/variants.json`, headers);
        return { providerId, productId, printProviderId, detail: variants };
      }
      if (productId) {
        const [blueprint, printProviders] = await Promise.all([
          providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}.json`, headers),
          providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}/print_providers.json`, headers),
        ]);
        return { providerId, productId, detail: blueprint, printProviders };
      }
      const response = await fetch(`${auth.baseUrl.replace(/\/$/, "")}/catalog/blueprints.json`, { headers: { accept: "application/json", ...headers }, cache: "no-store" });
      const raw = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const items = Array.isArray(raw) ? raw.map((item) => {
        const row = item as Record<string, unknown>;
        const images = Array.isArray(row.images) ? row.images.filter((value): value is string => typeof value === "string") : [];
        return { id: String(row.id ?? ""), title: String(row.title ?? "Untitled product"), brand: String(row.brand ?? ""), model: String(row.model ?? ""), image: images[0] ?? null };
      }) : [];
      return { providerId, items };
    }

    if (productId) {
      const detail = await providerFetch(auth.baseUrl, `/products/${encodeURIComponent(productId)}`, headers);
      return { providerId, productId, detail };
    }
    const payload = await providerFetch(auth.baseUrl, "/products", headers);
    const raw = Array.isArray(payload.result) ? payload.result : [];
    const items = raw.map((item) => {
      const row = item as Record<string, unknown>;
      return { id: String(row.id ?? ""), title: String(row.title ?? row.type_name ?? "Untitled product"), brand: String(row.brand ?? ""), model: String(row.model ?? ""), image: typeof row.image === "string" ? row.image : null, variantCount: Number(row.variant_count ?? 0) };
    });
    return { providerId, items };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw new OperationError(502, error instanceof Error ? error.message : String(error));
  }
}

/* ============================ SETTINGS ============================ */

export async function getWorkspaceSettings(organizationId: number) {
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  const rows = await db.select().from(settings).where(eq(settings.organizationId, organizationId));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    organization: organization
      ? { id: organization.id, name: organization.name, slug: organization.slug, plan: organization.plan, status: organization.status }
      : null,
    settings: values,
    /** Keys stored encrypted — callers that must never expose secrets filter these out. */
    encryptedKeys: rows.filter((row) => row.encrypted).map((row) => row.key),
  };
}

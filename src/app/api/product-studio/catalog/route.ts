import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/infrastructure";
import { authenticateProvider } from "@/lib/auth/transports";
import { getCurrentSession } from "@/lib/auth/session";
import { getProviderCredentials } from "@/lib/credentials/vault";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const providerId = url.searchParams.get("provider") ?? "";
  const productId = url.searchParams.get("productId");
  const printProviderId = url.searchParams.get("printProviderId");
  if (!['printify', 'printful'].includes(providerId)) {
    return Response.json({ error: "Product Studio currently supports Printify and Printful catalogs." }, { status: 400 });
  }

  const settingRows = await db.select().from(settings).where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
  const fulfillment = asList(values["commerce.fulfillment_providers"]);
  if (!fulfillment.includes(providerId)) return Response.json({ error: `${providerId} is not enabled for this workspace.` }, { status: 403 });

  const credentials = await getProviderCredentials(session.organizationId, providerId);
  const auth = authenticateProvider(providerId, credentials);
  if (!auth.ok || !auth.baseUrl) return Response.json({ error: auth.error ?? `Connect ${providerId} first.` }, { status: 400 });
  const headers = auth.headers ?? {};

  try {
    if (providerId === "printify") {
      if (productId && printProviderId) {
        const variants = await providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}/print_providers/${encodeURIComponent(printProviderId)}/variants.json`, headers);
        return Response.json({ providerId, productId, printProviderId, detail: variants });
      }
      if (productId) {
        const [blueprint, printProviders] = await Promise.all([
          providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}.json`, headers),
          providerFetch(auth.baseUrl, `/catalog/blueprints/${encodeURIComponent(productId)}/print_providers.json`, headers),
        ]);
        return Response.json({ providerId, productId, detail: blueprint, printProviders });
      }
      const response = await fetch(`${auth.baseUrl.replace(/\/$/, "")}/catalog/blueprints.json`, { headers: { accept: "application/json", ...headers }, cache: "no-store" });
      const raw = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const items = Array.isArray(raw) ? raw.map((item) => {
        const row = item as Record<string, unknown>;
        const images = Array.isArray(row.images) ? row.images.filter((value): value is string => typeof value === "string") : [];
        return { id: String(row.id ?? ""), title: String(row.title ?? "Untitled product"), brand: String(row.brand ?? ""), model: String(row.model ?? ""), image: images[0] ?? null };
      }) : [];
      return Response.json({ providerId, items });
    }

    if (productId) {
      const detail = await providerFetch(auth.baseUrl, `/products/${encodeURIComponent(productId)}`, headers);
      return Response.json({ providerId, productId, detail });
    }
    const payload = await providerFetch(auth.baseUrl, "/products", headers);
    const raw = Array.isArray(payload.result) ? payload.result : [];
    const items = raw.map((item) => {
      const row = item as Record<string, unknown>;
      return { id: String(row.id ?? ""), title: String(row.title ?? row.type_name ?? "Untitled product"), brand: String(row.brand ?? ""), model: String(row.model ?? ""), image: typeof row.image === "string" ? row.image : null, variantCount: Number(row.variant_count ?? 0) };
    });
    return Response.json({ providerId, items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

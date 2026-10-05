import { getProvider } from "@/lib/commerce/registry";
import type { ProviderDescriptor } from "@/lib/commerce/types";

export interface AuthResult {
  ok: boolean;
  mode: "live" | "sandbox";
  headers?: Record<string, string>;
  error?: string;
  refreshed?: boolean;
  scopes?: string[];
  baseUrl?: string;
  shopRef?: string;
  locationId?: string;
}

export interface AuthTransport {
  id: string;
  provider: ProviderDescriptor;
  authenticate(credentials: Record<string, string>): AuthResult;
}

function complete(providerId: string, credentials: Record<string, string>) {
  const provider = getProvider(providerId);
  return provider.envKeys.every((key) => Boolean(credentials[key]));
}

function sandbox(providerId: string, credentials: Record<string, string>): AuthResult {
  const provider = getProvider(providerId);
  const missing = provider.envKeys.filter((key) => !credentials[key]);
  return { ok: false, mode: "sandbox", error: `Missing ${missing.join(", ")}` };
}

const transports: Record<string, AuthTransport> = {
  shopify: {
    id: "shopify",
    provider: getProvider("shopify"),
    authenticate(credentials) {
      if (!complete("shopify", credentials)) return sandbox("shopify", credentials);
      const raw = credentials.SHOPIFY_SHOP.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const host = raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;
      return {
        ok: true,
        mode: "live",
        headers: { "X-Shopify-Access-Token": credentials.SHOPIFY_ADMIN_TOKEN },
        baseUrl: `https://${host}/admin/api/2025-01`,
        shopRef: host,
      };
    },
  },
  woocommerce: {
    id: "woocommerce",
    provider: getProvider("woocommerce"),
    authenticate(credentials) {
      if (!complete("woocommerce", credentials)) return sandbox("woocommerce", credentials);
      const store = credentials.WOO_STORE_URL.replace(/\/$/, "");
      return {
        ok: true,
        mode: "live",
        headers: {
          Authorization: `Basic ${Buffer.from(`${credentials.WOO_CONSUMER_KEY}:${credentials.WOO_CONSUMER_SECRET}`).toString("base64")}`,
        },
        baseUrl: `${store}/wp-json/wc/v3`,
        shopRef: store,
      };
    },
  },
  square: {
    id: "square",
    provider: getProvider("square"),
    authenticate(credentials) {
      if (!complete("square", credentials)) return sandbox("square", credentials);
      return {
        ok: true,
        mode: "live",
        headers: { Authorization: `Bearer ${credentials.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2025-01-15" },
        baseUrl: "https://connect.squareup.com/v2",
        locationId: credentials.SQUARE_LOCATION_ID,
      };
    },
  },
  ebay: {
    id: "ebay",
    provider: getProvider("ebay"),
    authenticate(credentials) {
      if (!complete("ebay", credentials)) return sandbox("ebay", credentials);
      return {
        ok: true,
        mode: "live",
        headers: { Authorization: `Bearer ${credentials.EBAY_ACCESS_TOKEN}`, "Content-Language": "en-US" },
        baseUrl: "https://api.ebay.com/sell/inventory/v1",
        locationId: credentials.EBAY_MERCHANT_LOCATION_KEY,
      };
    },
  },
  etsy: {
    id: "etsy",
    provider: getProvider("etsy"),
    authenticate(credentials) {
      if (!complete("etsy", credentials)) return sandbox("etsy", credentials);
      return {
        ok: true,
        mode: "live",
        headers: { Authorization: `Bearer ${credentials.ETSY_ACCESS_TOKEN}`, "x-api-key": credentials.ETSY_API_KEY },
        baseUrl: "https://openapi.etsy.com/v3/application",
        shopRef: credentials.ETSY_SHOP_ID,
      };
    },
  },
  printify: {
    id: "printify",
    provider: getProvider("printify"),
    authenticate(credentials) {
      if (!complete("printify", credentials)) return sandbox("printify", credentials);
      return {
        ok: true,
        mode: "live",
        headers: { Authorization: `Bearer ${credentials.PRINTIFY_API_TOKEN}` },
        baseUrl: "https://api.printify.com/v1",
        shopRef: credentials.PRINTIFY_SHOP_ID,
      };
    },
  },
  printful: {
    id: "printful",
    provider: getProvider("printful"),
    authenticate(credentials) {
      if (!complete("printful", credentials)) return sandbox("printful", credentials);
      return {
        ok: true,
        mode: "live",
        headers: { Authorization: `Bearer ${credentials.PRINTFUL_API_KEY}`, "X-PF-Store-Id": credentials.PRINTFUL_STORE_ID },
        baseUrl: "https://api.printful.com",
        shopRef: credentials.PRINTFUL_STORE_ID,
      };
    },
  },
};

export function credentialsFromEnvironment(providerId: string): Record<string, string> {
  const provider = getProvider(providerId);
  return Object.fromEntries(provider.envKeys.flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []));
}

export function getAuthTransport(providerId: string): AuthTransport | null {
  return transports[providerId] ?? null;
}

export function authenticateProvider(providerId: string, credentials: Record<string, string>): AuthResult {
  const transport = getAuthTransport(providerId);
  if (!transport) return { ok: false, mode: "sandbox", error: `Live auth transport is not implemented for ${providerId}` };
  return transport.authenticate(credentials);
}

export function providerIsAuthenticated(providerId: string): boolean {
  return authenticateProvider(providerId, credentialsFromEnvironment(providerId)).ok;
}

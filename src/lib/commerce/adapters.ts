import type { NormalizedProduct, ProviderRequest } from "./types";
import { getProvider } from "./registry";

export interface AdapterContext { shopRef: string; locationId: string; }
export interface ListingRef { externalId: string; url: string; }
export interface CommerceAdapter {
  id: string;
  createProduct(p: NormalizedProduct, ctx: AdapterContext): ProviderRequest;
  uploadMedia(p: NormalizedProduct, ctx: AdapterContext): ProviderRequest;
  setPrice(ref: string, price: number, ctx: AdapterContext): ProviderRequest;
  setInventory(ref: string, qty: number, ctx: AdapterContext): ProviderRequest;
  publish(ref: string, ctx: AdapterContext): ProviderRequest;
  unpublish(ref: string, ctx: AdapterContext): ProviderRequest;
  listOrders(ctx: AdapterContext): ProviderRequest;
  fulfillOrder(orderRef: string, tracking: string, ctx: AdapterContext): ProviderRequest;
  identify(p: NormalizedProduct, seed: number): ListingRef;
}

const money = (n: number) => n.toFixed(2);
const firstImage = (p: NormalizedProduct) => p.images[0]?.url;

function genericAdapter(id: string): CommerceAdapter {
  const p = getProvider(id);
  const root = p.protocol === "GraphQL" ? "/graphql" : "";
  return {
    id,
    createProduct: (prod) => ({ method: "POST", endpoint: `${root}/products`, body: { title: prod.title, description: prod.description, price: money(prod.price), tags: prod.tags, variants: prod.variants } }),
    uploadMedia: (prod) => ({ method: "POST", endpoint: `${root}/media`, body: { images: prod.images.map((i) => i.url) } }),
    setPrice: (ref, price) => ({ method: "PATCH", endpoint: `${root}/products/${ref}`, body: { price: money(price) } }),
    setInventory: (ref, qty) => ({ method: "PATCH", endpoint: `${root}/products/${ref}/inventory`, body: { quantity: qty } }),
    publish: (ref) => ({ method: "POST", endpoint: `${root}/products/${ref}/publish`, body: { channel: "default" } }),
    unpublish: (ref) => ({ method: "POST", endpoint: `${root}/products/${ref}/unpublish`, body: {} }),
    listOrders: () => ({ method: "GET", endpoint: `${root}/orders?status=open` }),
    fulfillOrder: (orderRef, tracking) => ({ method: "POST", endpoint: `${root}/orders/${orderRef}/fulfillments`, body: { tracking_number: tracking, carrier: "USPS" } }),
    identify: (prod, seed) => { const ext = `${id.slice(0, 3)}_${seed}`; return { externalId: ext, url: `https://${id}.example.com/products/${prod.slug}-${ext}` }; },
  };
}

const shopify: CommerceAdapter = {
  id: "shopify",
  createProduct: (p) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: {
      query: "mutation ProductCreate($product: ProductCreateInput!) { productCreate(product: $product) { product { id handle title } userErrors { field message } } }",
      variables: { product: { title: p.title, descriptionHtml: p.description, productType: p.blueprint?.category ?? "", tags: p.tags } },
    },
  }),
  uploadMedia: (p) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: {
      query: "mutation StagedUploadsCreate($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }",
      variables: { input: p.images.map((image, i) => ({ filename: `${p.slug}-${i + 1}.jpg`, mimeType: "image/jpeg", resource: "IMAGE", httpMethod: "POST", fileSize: "1" })) },
    },
  }),
  setPrice: (ref, price) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: {
      query: "mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id price } userErrors { field message } } }",
      variables: { productId: ref, variants: [{ id: ref, price: money(price) }] },
    },
  }),
  setInventory: (ref, qty) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: {
      query: "mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }",
      variables: { input: { name: "available", reason: "correction", quantities: [{ inventoryItemId: ref, locationId: "gid://shopify/Location/0", quantity: qty }] } },
    },
  }),
  publish: (ref) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: { query: "mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }", variables: { id: ref, input: [] } },
  }),
  unpublish: (ref) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: { query: "mutation PublishableUnpublish($id: ID!, $input: [PublicationInput!]!) { publishableUnpublish(id: $id, input: $input) { userErrors { field message } } }", variables: { id: ref, input: [] } },
  }),
  listOrders: () => ({ method: "POST", endpoint: "/graphql.json", body: { query: "query { orders(first: 25, query: \"status:open\") { nodes { id name displayFinancialStatus displayFulfillmentStatus } } }" } }),
  fulfillOrder: (orderRef, tracking) => ({
    method: "POST",
    endpoint: "/graphql.json",
    body: { query: "mutation FulfillmentCreate($fulfillment: FulfillmentInput!) { fulfillmentCreate(fulfillment: $fulfillment) { fulfillment { id status } userErrors { field message } } }", variables: { fulfillment: { lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: orderRef }], trackingInfo: { number: tracking, company: "USPS" }, notifyCustomer: true } } },
  }),
  identify: (p, seed) => ({ externalId: `gid://shopify/Product/${seed}`, url: `https://${p.slug}.myshopify.com/products/${p.slug}` }),
};

const woocommerce: CommerceAdapter = {
  id: "woocommerce",
  createProduct: (p) => ({ method: "POST", endpoint: "/products", body: { name: p.title, type: "variable", status: "draft", description: p.description, regular_price: money(p.price), images: p.images.map((i) => ({ src: i.url, alt: i.alt })), tags: p.tags.map((name) => ({ name })) } }),
  uploadMedia: (p) => ({ method: "POST", endpoint: "/products", body: { name: p.title, images: p.images.map((i) => ({ src: i.url, alt: i.alt })) } }),
  setPrice: (ref, price) => ({ method: "PUT", endpoint: `/products/${ref}`, body: { regular_price: money(price) } }),
  setInventory: (ref, qty) => ({ method: "PUT", endpoint: `/products/${ref}`, body: { manage_stock: true, stock_quantity: qty } }),
  publish: (ref) => ({ method: "PUT", endpoint: `/products/${ref}`, body: { status: "publish" } }),
  unpublish: (ref) => ({ method: "PUT", endpoint: `/products/${ref}`, body: { status: "draft" } }),
  listOrders: () => ({ method: "GET", endpoint: "/orders?status=processing&per_page=25" }),
  fulfillOrder: (orderRef, tracking) => ({ method: "PUT", endpoint: `/orders/${orderRef}`, body: { status: "completed", meta_data: [{ key: "_tracking_number", value: tracking }, { key: "_tracking_provider", value: "USPS" }] } }),
  identify: (p, seed) => ({ externalId: String(seed), url: `${p.slug}/${seed}` }),
};

const square: CommerceAdapter = {
  id: "square",
  createProduct: (p) => ({
    method: "POST",
    endpoint: "/catalog/object",
    body: { idempotency_key: `salesteam-${p.slug}`, object: { type: "ITEM", id: "#item", item_data: { name: p.title, description: p.description, variations: p.variants.map((v, i) => ({ type: "ITEM_VARIATION", id: `#variation-${i}`, item_variation_data: { name: Object.values(v.options).join(" / ") || v.sku, sku: v.sku, pricing_type: "FIXED_PRICING", price_money: { amount: Math.round(v.price * 100), currency: p.currency } } })) } } },
  }),
  uploadMedia: (p) => ({ method: "POST", endpoint: "/catalog/images", body: { idempotency_key: `salesteam-image-${p.slug}`, image: { type: "IMAGE", id: "#image", image_data: { caption: p.images[0]?.alt ?? p.title, url: firstImage(p) } } } }),
  setPrice: (ref, price) => ({ method: "POST", endpoint: "/catalog/object", body: { idempotency_key: `salesteam-price-${ref}-${money(price)}`, object: { type: "ITEM_VARIATION", id: ref, item_variation_data: { pricing_type: "FIXED_PRICING", price_money: { amount: Math.round(price * 100), currency: "USD" } } } } }),
  setInventory: (ref, qty, ctx) => ({ method: "POST", endpoint: "/inventory/changes/batch-create", body: { idempotency_key: `salesteam-inventory-${ref}-${qty}`, changes: [{ type: "PHYSICAL_COUNT", physical_count: { catalog_object_id: ref, location_id: ctx.locationId, state: "IN_STOCK", quantity: String(qty), occurred_at: new Date(0).toISOString() } }] } }),
  publish: (ref) => ({ method: "POST", endpoint: "/catalog/object", body: { idempotency_key: `salesteam-publish-${ref}`, object: { type: "ITEM", id: ref, present_at_all_locations: true } } }),
  unpublish: (ref) => ({ method: "POST", endpoint: "/catalog/object", body: { idempotency_key: `salesteam-unpublish-${ref}`, object: { type: "ITEM", id: ref, present_at_all_locations: false } } }),
  listOrders: (ctx) => ({ method: "POST", endpoint: "/orders/search", body: { location_ids: [ctx.locationId], limit: 25, query: { filter: { state_filter: { states: ["OPEN", "COMPLETED"] } } } } }),
  fulfillOrder: (orderRef, tracking) => ({ method: "POST", endpoint: `/orders/${orderRef}/fulfillments`, body: { fulfillment: { type: "SHIPMENT", state: "PROPOSED", shipment_details: { tracking_number: tracking, shipping_note: "USPS" } } } }),
  identify: (p, seed) => ({ externalId: `SQ_${seed}`, url: `square://${p.slug}/${seed}` }),
};

const printify: CommerceAdapter = {
  id: "printify",
  createProduct: (p, ctx) => ({ method: "POST", endpoint: `/shops/${ctx.shopRef}/products.json`, body: { title: p.title, description: p.description, blueprint_id: Number(p.blueprint?.blueprintId ?? 0), print_provider_id: Number(p.blueprint?.printProviderId ?? 0), variants: p.variants.map((v, i) => ({ id: Number(v.options.variantId ?? i + 1), price: Math.round(v.price * 100), is_enabled: true })), print_areas: [] } }),
  uploadMedia: (p) => ({ method: "POST", endpoint: "/uploads/images.json", body: { file_name: `${p.slug}.jpg`, url: firstImage(p) ?? "" } }),
  setPrice: (ref, price, ctx) => ({ method: "PUT", endpoint: `/shops/${ctx.shopRef}/products/${ref}.json`, body: { variants: [{ price: Math.round(price * 100), is_enabled: true }] } }),
  setInventory: (ref, qty, ctx) => ({ method: "PUT", endpoint: `/shops/${ctx.shopRef}/products/${ref}.json`, body: { inventory: qty } }),
  publish: (ref, ctx) => ({ method: "POST", endpoint: `/shops/${ctx.shopRef}/products/${ref}/publish.json`, body: { title: true, description: true, images: true, variants: true, tags: true, keyFeatures: true, shipping_template: true } }),
  unpublish: (ref, ctx) => ({ method: "POST", endpoint: `/shops/${ctx.shopRef}/products/${ref}/unpublish.json`, body: {} }),
  listOrders: (ctx) => ({ method: "GET", endpoint: `/shops/${ctx.shopRef}/orders.json?limit=25` }),
  fulfillOrder: (orderRef, tracking, ctx) => ({ method: "POST", endpoint: `/shops/${ctx.shopRef}/orders/${orderRef}/send_to_production.json`, body: { tracking_number: tracking } }),
  identify: (p, seed) => ({ externalId: `prf_${seed}`, url: `https://printify.com/app/products/${seed}/${p.slug}` }),
};

const printful: CommerceAdapter = {
  id: "printful",
  createProduct: (p) => ({ method: "POST", endpoint: "/store/products", body: { sync_product: { name: p.title, thumbnail: firstImage(p) }, sync_variants: p.variants.map((v, i) => ({ external_id: v.sku, variant_id: Number(v.options.variantId ?? i + 1), retail_price: money(v.price), files: p.images.length ? [{ url: firstImage(p) }] : [] })) } }),
  uploadMedia: (p) => ({ method: "POST", endpoint: "/files", body: { url: firstImage(p) ?? "", type: "default" } }),
  setPrice: (ref, price) => ({ method: "PUT", endpoint: `/store/variants/${ref}`, body: { retail_price: money(price) } }),
  setInventory: (ref, qty) => ({ method: "PUT", endpoint: `/store/variants/${ref}`, body: { inventory: qty } }),
  publish: (ref) => ({ method: "PUT", endpoint: `/store/products/${ref}`, body: { sync_product: { is_ignored: false } } }),
  unpublish: (ref) => ({ method: "PUT", endpoint: `/store/products/${ref}`, body: { sync_product: { is_ignored: true } } }),
  listOrders: () => ({ method: "GET", endpoint: "/orders?status=pending&limit=25" }),
  fulfillOrder: (orderRef, tracking) => ({ method: "PUT", endpoint: `/orders/${orderRef}`, body: { confirm: true, tracking_number: tracking } }),
  identify: (p, seed) => ({ externalId: `pfl_${seed}`, url: `https://www.printful.com/dashboard/sync/products/${seed}?name=${encodeURIComponent(p.slug)}` }),
};

const ADAPTERS: Record<string, CommerceAdapter> = { shopify, woocommerce, square, printify, printful };
export const BESPOKE_ADAPTERS = ["shopify", "woocommerce", "square", "ebay", "etsy", "printify", "printful", "amazon", "walmart", "tiktok", "bigcommerce"];
export const VERIFIED_REQUEST_ADAPTERS = Object.keys(ADAPTERS);
export function getAdapter(id: string): CommerceAdapter { return ADAPTERS[id] ?? genericAdapter(id); }

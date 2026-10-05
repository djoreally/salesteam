/** Normalized commerce primitives — Universal Commerce Protocol (UCP). */
export type Capability =
  | "products.read" | "products.write" | "products.delete"
  | "media.read" | "media.write"
  | "variants.read" | "variants.write"
  | "price.read" | "price.write" | "pricing.read" | "pricing.write" | "pricing.promotions.write"
  | "inventory.read" | "inventory.write"
  | "publish" | "listing.create" | "listing.update" | "listing.publish" | "listing.pause" | "listing.delete"
  | "orders.read" | "orders.acknowledge" | "orders.cancel"
  | "fulfillment.read" | "fulfillment.create" | "fulfillment.update" | "fulfillment.tracking" | "fulfillment.write"
  | "returns.read" | "returns.create" | "refunds.read" | "refunds.write"
  | "analytics.read" | "analytics.catalog.read" | "analytics.sales.read"
  | "customers.read" | "customers.write" | "shipping.read" | "shipping.labels.write" | "webhooks.read" | "webhooks.write"
  | "catalog.products.read" | "catalog.products.write" | "catalog.products.delete"
  | "catalog.variants.read" | "catalog.variants.write" | "catalog.media.read" | "catalog.media.write"
  | "catalog.categories.read" | "catalog.categories.write" | "catalog.collections.read" | "catalog.collections.write"
  | "manufacturing.catalog.read" | "manufacturing.product.write" | "manufacturing.order.write" | "manufacturing.status.read" | "pod.manufacture"
  | "research.demand" | "research.competition" | "research.trends" | "research.social" | "research.pricing";
export type ProviderKind="storefront"|"marketplace"|"pod"|"channel"|"digital"|"oss";
export type Priority="P0"|"P1"|"P2"|"P3";
export type AuthKind="oauth2"|"api_key"|"basic"|"hmac"|"lwa";
export type ProviderState="registered"|"connected"|"certified"|"production_enabled";
export interface ProviderDescriptor { id:string; name:string; kind:ProviderKind; priority:Priority; auth:AuthKind; protocol:"REST"|"GraphQL"|"REST+SOAP"|"Feed"; baseUrl:string; docs:string; control:"excellent"|"very good"|"strong"|"partial"; capabilities:Capability[]; scopes:string[]; envKeys:string[]; feeRate:number; notes:string; adapterStatus:"simulated"|"bespoke"|"certified"; }
export interface NormalizedImage { role:"primary"|"mockup"|"design"|"lifestyle"; url:string; alt:string; }
export interface NormalizedVariant { sku:string; options:Record<string,string>; cost:number; price:number; inventory:number; }
export interface NormalizedProduct { id?:number; title:string; slug:string; description:string; bullets:string[]; tags:string[]; seo:{title:string;description:string;keywords:string}; images:NormalizedImage[]; variants:NormalizedVariant[]; unitCost:number; shippingCost:number; price:number; currency:string; blueprint?:Record<string,unknown>; }
export interface ProviderRequest { method:"GET"|"POST"|"PUT"|"PATCH"|"DELETE"; endpoint:string; body?:Record<string,unknown>; headers?:Record<string,string>; }
export interface ProviderResult<T=Record<string,unknown>> { ok:boolean; mode:"live"|"sandbox"; statusCode:number; externalId?:string; url?:string; data:T; request:ProviderRequest; latencyMs:number; message?:string; simulated?:boolean; plane?:string; }
export interface NormalizedOrder { externalId:string; providerId:string; sku:string; quantity:number; revenue:number; customer:Record<string,string>; }
export interface FulfillmentResult { externalId:string; status:string; carrier:string; tracking:string; cost:number; }

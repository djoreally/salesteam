import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * Commerce Control Plane schema.
 *
 * 5 planes:
 *  1. Intelligence   (opportunities, research signals)
 *  2. Creation       (product master, designs, SEO, copy)
 *  3. Commerce       (listings, orders, fulfillments, pricing, inventory)
 *  4. Supply         (manufacturing, fulfillment, tracking)
 *  5. Operations     (optimization, analytics, decisions, certification)
 *
 * Everything provider-specific lives in adapters. The database owns
 * the Product Master — not Shopify, not Etsy.
 */

export const providerState = pgEnum("provider_state", [
  "registered",
  "connected",
  "certified",
  "production_enabled",
]);

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("running"),
  channels: jsonb("channels").$type<string[]>().notNull().default([]),
  fulfillmentProvider: text("fulfillment_provider"),
  summary: jsonb("summary").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const runSteps = pgTable("run_steps", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  idx: integer("idx").notNull(),
  agent: text("agent").notNull(),
  plane: text("plane").notNull().default("intelligence"),
  action: text("action").notNull(),
  status: text("status").notNull().default("ok"),
  summary: text("summary").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  durationMs: integer("duration_ms").notNull().default(0),
  simulated: boolean("simulated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  label: text("label").notNull(),
  state: providerState("state").notNull().default("registered"),
  mode: text("mode").notNull().default("sandbox"),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  credentialsPresent: boolean("credentials_present").notNull().default(false),
  shopRef: text("shop_ref"),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  productionEnabledAt: timestamp("production_enabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===================== INTELLIGENCE PLANE ===================== */

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  theme: text("theme").notNull(),
  concept: text("concept").notNull(),
  angle: text("angle").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  demand: doublePrecision("demand").notNull(),
  growth: doublePrecision("growth").notNull(),
  margin: doublePrecision("margin").notNull(),
  searchVolume: integer("search_volume").notNull(),
  socialVelocity: doublePrecision("social_velocity").notNull(),
  competition: doublePrecision("competition").notNull(),
  score: doublePrecision("score").notNull(),
  riskLevel: text("risk_level").notNull().default("low"),
  riskNotes: jsonb("risk_notes").$type<string[]>().notNull().default([]),
  signals: jsonb("signals").$type<Record<string, unknown>>(),
  selected: boolean("selected").notNull().default(false),
  simulatedSignals: boolean("simulated_signals").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchSources = pgTable("research_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adapterStatus: text("adapter_status").notNull().default("simulated"),
  endpoint: text("endpoint"),
  enabled: boolean("enabled").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
});

/* ===================== CREATION PLANE (Master Product) ===================== */

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  opportunityId: integer("opportunity_id"),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  seo: jsonb("seo").$type<Record<string, string>>(),
  images: jsonb("images").$type<{ role: string; url: string; alt: string }[]>().notNull().default([]),
  blueprint: jsonb("blueprint").$type<Record<string, unknown>>(),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  shippingCost: doublePrecision("shipping_cost").notNull().default(0),
  price: doublePrecision("price").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  masterProductId: text("master_product_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  masterProductId: text("master_product_id"),
  sku: text("sku").notNull(),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
  cost: doublePrecision("cost").notNull().default(0),
  price: doublePrecision("price").notNull().default(0),
  inventory: integer("inventory").notNull().default(0),
});

/* ===================== COMMERCE PLANE ===================== */

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  providerId: text("provider_id").notNull(),
  externalId: text("external_id"),
  url: text("url"),
  status: text("status").notNull().default("draft"),
  price: doublePrecision("price").notNull().default(0),
  message: text("message"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(),
  providerId: text("provider_id").notNull(),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id"),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull().default(1),
  revenue: doublePrecision("revenue").notNull().default(0),
  goodsCost: doublePrecision("goods_cost").notNull().default(0),
  channelFee: doublePrecision("channel_fee").notNull().default(0),
  shipping: doublePrecision("shipping").notNull().default(0),
  profit: doublePrecision("profit").notNull().default(0),
  customer: jsonb("customer").$type<Record<string, string>>(),
  status: text("status").notNull().default("paid"),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===================== SUPPLY PLANE ===================== */

export const fulfillments = pgTable("fulfillments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  providerId: text("provider_id").notNull(),
  externalId: text("external_id").notNull(),
  status: text("status").notNull().default("in_production"),
  carrier: text("carrier"),
  tracking: text("tracking"),
  cost: doublePrecision("cost").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===================== OPERATIONS PLANE ===================== */

export const apiCalls = pgTable("api_calls", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  providerId: text("provider_id").notNull(),
  capability: text("capability").notNull(),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  mode: text("mode").notNull().default("sandbox"),
  simulated: boolean("simulated").notNull().default(false),
  statusCode: integer("status_code").notNull().default(200),
  request: jsonb("request").$type<Record<string, unknown>>(),
  response: jsonb("response").$type<Record<string, unknown>>(),
  latencyMs: integer("latency_ms").notNull().default(0),
  plane: text("plane").notNull().default("commerce"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  plane: text("plane").notNull().default("operations"),
  before: doublePrecision("before"),
  after: doublePrecision("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===================== CERTIFICATION ===================== */

export const providerCertifications = pgTable("provider_certifications", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  adapterType: text("adapter_type").notNull().default("bespoke"),
  capabilitiesCertified: jsonb("capabilities_certified").$type<string[]>().notNull().default([]),
  testsPassed: integer("tests_passed").notNull().default(0),
  testsTotal: integer("tests_total").notNull().default(0),
  certified: boolean("certified").notNull().default(false),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

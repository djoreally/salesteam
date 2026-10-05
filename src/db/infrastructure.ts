import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Application infrastructure schema.
 * These tables make the commerce control plane a real multi-tenant application.
 */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin | member | viewer
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("starter"), // starter | professional | enterprise
  status: text("status").notNull().default("trial"), // trial | active | suspended | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMemberships = pgTable("workspace_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  role: text("role").notNull().default("member"),
  invitedBy: integer("invited_by"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull().default({}),
  encrypted: boolean("encrypted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const credentialVault = pgTable("credential_vault", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  providerId: text("provider_id").notNull(),
  encryptedSecret: text("encrypted_secret").notNull(),
  secretName: text("secret_name").notNull(), // e.g. "SHOPIFY_ADMIN_TOKEN", "WOO_CONSUMER_KEY"
  scope: jsonb("scope").$type<string[]>().notNull().default([]),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const onboardingState = pgTable("onboarding_state", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  step: text("step").notNull(), // account_setup | connect_woocommerce | connect_printify | first_run | complete
  completedSteps: jsonb("completed_steps").$type<string[]>().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/infrastructure";

/**
 * Workspace API keys (used by the MCP server at /api/mcp).
 *
 * Format: `st_live_` + 32 random bytes (base64url). The full key is returned
 * exactly once, from createApiKey. Only its SHA-256 hash is stored, so a
 * database leak never exposes a usable key.
 */

export const API_KEY_PREFIX = "st_live_";
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export interface CreatedApiKey {
  id: number;
  name: string;
  /** The full key. Shown once at creation; never stored or retrievable again. */
  key: string;
  keyPrefix: string;
  createdAt: Date;
}

export interface ApiKeySummary {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export async function createApiKey(organizationId: number, name: string): Promise<CreatedApiKey> {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const [row] = await db
    .insert(apiKeys)
    .values({
      organizationId,
      name: name.trim() || "Muse",
      keyHash: hashKey(key),
      keyPrefix: key.slice(0, DISPLAY_PREFIX_LENGTH),
    })
    .returning();
  return { id: row.id, name: row.name, key, keyPrefix: row.keyPrefix, createdAt: row.createdAt };
}

/**
 * Resolve a bearer token to the workspace it acts for.
 * Returns null for missing, malformed, unknown or revoked keys.
 * A database failure also resolves to null (fail closed).
 */
export async function resolveApiKey(
  bearerToken: string | null | undefined,
): Promise<{ organizationId: number; keyId: number } | null> {
  if (!bearerToken || !bearerToken.startsWith(API_KEY_PREFIX)) return null;
  try {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashKey(bearerToken)), isNull(apiKeys.revokedAt)));
    if (!row) return null;
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
    return { organizationId: row.organizationId, keyId: row.id };
  } catch {
    return null;
  }
}

/** Metadata only — never the key itself and never the full hash. */
export async function listApiKeys(organizationId: number): Promise<ApiKeySummary[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(desc(apiKeys.id));
  return rows;
}

/** Revoke a key owned by this workspace. Returns false if not found / already revoked. */
export async function revokeApiKey(organizationId: number, keyId: number): Promise<boolean> {
  const updated = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return updated.length > 0;
}

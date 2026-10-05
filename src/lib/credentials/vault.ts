import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { credentialVault } from "@/db/infrastructure";
import { getProvider } from "@/lib/commerce/registry";
import { and, eq } from "drizzle-orm";

const VERSION = "v1";

function keySources(): string[] {
  const sources = [process.env.CREDENTIAL_VAULT_KEY, process.env.DATABASE_URL].filter((value): value is string => Boolean(value));
  if (!sources.length) throw new Error("Credential vault key is not configured");
  return Array.from(new Set(sources));
}

function keyForOrganization(source: string, organizationId: number): Buffer {
  return createHash("sha256")
    .update(`${source}|salesteam-credential-vault|${organizationId}`)
    .digest();
}

export function encryptCredential(organizationId: number, plaintext: string): string {
  const iv = randomBytes(12);
  const key = keyForOrganization(keySources()[0], organizationId);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptCredential(organizationId: number, encoded: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = encoded.split(":");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Unsupported credential format");

  for (const source of keySources()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", keyForOrganization(source, organizationId), Buffer.from(ivRaw, "base64url"));
      decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
    } catch {
      // Try the next configured key source. This permits a controlled re-key from
      // the temporary DATABASE_URL-derived key to CREDENTIAL_VAULT_KEY.
    }
  }
  throw new Error("Unable to decrypt provider credential with configured vault keys");
}

export async function credentialStatus(organizationId: number, providerId: string) {
  const provider = getProvider(providerId);
  const rows = await db
    .select({ secretName: credentialVault.secretName, rotatedAt: credentialVault.rotatedAt, updatedAt: credentialVault.updatedAt })
    .from(credentialVault)
    .where(and(eq(credentialVault.organizationId, organizationId), eq(credentialVault.providerId, providerId)));
  const configured = new Set(rows.map((row) => row.secretName));
  const missing = provider.envKeys.filter((name) => !configured.has(name));
  return {
    providerId,
    required: provider.envKeys,
    configured: rows.map((row) => row.secretName),
    missing,
    complete: missing.length === 0,
  };
}

export async function getProviderCredentials(organizationId: number, providerId: string): Promise<Record<string, string>> {
  const provider = getProvider(providerId);
  const allowed = new Set(provider.envKeys);
  const rows = await db
    .select()
    .from(credentialVault)
    .where(and(eq(credentialVault.organizationId, organizationId), eq(credentialVault.providerId, providerId)));
  const credentials: Record<string, string> = {};
  for (const row of rows) {
    if (!allowed.has(row.secretName)) continue;
    credentials[row.secretName] = decryptCredential(organizationId, row.encryptedSecret);
  }
  return credentials;
}

export async function saveProviderCredentials(args: {
  organizationId: number;
  userId: number;
  providerId: string;
  secrets: Record<string, string>;
}) {
  const provider = getProvider(args.providerId);
  const allowed = new Set(provider.envKeys);
  const entries = Object.entries(args.secrets).filter(([, value]) => typeof value === "string" && value.trim().length > 0);
  const unknown = entries.map(([name]) => name).filter((name) => !allowed.has(name));
  if (unknown.length) throw new Error(`Unsupported credential fields: ${unknown.join(", ")}`);

  await db.transaction(async (tx) => {
    for (const [secretName, value] of entries) {
      await tx
        .delete(credentialVault)
        .where(
          and(
            eq(credentialVault.organizationId, args.organizationId),
            eq(credentialVault.providerId, args.providerId),
            eq(credentialVault.secretName, secretName),
          ),
        );
      await tx.insert(credentialVault).values({
        organizationId: args.organizationId,
        userId: args.userId,
        providerId: args.providerId,
        secretName,
        encryptedSecret: encryptCredential(args.organizationId, value.trim()),
        scope: [],
        rotatedAt: new Date(),
      });
    }
  });
  return credentialStatus(args.organizationId, args.providerId);
}

export async function clearProviderCredentials(organizationId: number, providerId: string) {
  await db
    .delete(credentialVault)
    .where(and(eq(credentialVault.organizationId, organizationId), eq(credentialVault.providerId, providerId)));
  return credentialStatus(organizationId, providerId);
}

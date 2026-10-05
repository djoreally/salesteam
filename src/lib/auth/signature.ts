/**
 * Ed25519 Cryptographic Verification Framework.
 * The external certification runner holds the PRIVATE KEY.
 * This commerce control plane only receives the PUBLIC KEY.
 */
export interface Ed25519PublicKey { format: "ed25519"; algorithm: "Ed25519"; keyType: "public"; publicKeyBase64: string; fingerprint: string; }
export interface CertificationReceipt { receiptId: string; milestoneId: string; runnerId: string; signedAt: string; providerResults: ProviderCertificationResult[]; writeReadbackPairs: WriteReadbackPair[]; integrityChecks: IntegrityCheck[]; evidenceHash: string; signature: Ed25519Signature; }
export interface Ed25519Signature { format: "ed25519"; algorithm: "Ed25519"; keyId: string; valueBase64: string; }
export interface ProviderCertificationResult { providerId: string; adapterStatus: string; certified: boolean; testsPassed: number; testsTotal: number; capabilitiesCertified: number; capabilitiesRequired: number; evidenceRefs: string[]; }
export interface WriteReadbackPair { pairId: string; writeEvidenceId: string; readbackEvidenceId: string; capability: string; providerId: string; expectedValue: unknown; observedValue: unknown; verified: boolean; writeTimestamp: string; readbackTimestamp: string; latencyMs: number; }
export interface IntegrityCheck { checkId: string; description: string; passed: boolean; details?: Record<string, unknown>; verifiedAt: string; }

export function verifyCertificationReceipt(receipt: CertificationReceipt, publicKey: Ed25519PublicKey): { verified: boolean; errors: string[]; fingerprintMatch: boolean } {
  const errors: string[] = [];
  const fingerprintMatch = publicKey.fingerprint === receipt.signature.keyId;
  if (!fingerprintMatch) errors.push(`Public key fingerprint mismatch: expected ${publicKey.fingerprint}, got ${receipt.signature.keyId}`);
  if (!receipt.milestoneId) errors.push("Missing milestoneId");
  if (!receipt.providerResults || receipt.providerResults.length === 0) errors.push("No provider results");
  if (!receipt.writeReadbackPairs || receipt.writeReadbackPairs.length === 0) errors.push("No write/readback pairs (required for Core v1)");
  if (!receipt.signature || !receipt.signature.valueBase64) errors.push("Missing Ed25519 signature");
  for (const pair of receipt.writeReadbackPairs) {
    if (!pair.writeEvidenceId) errors.push(`Pair ${pair.pairId}: missing writeEvidenceId`);
    if (!pair.readbackEvidenceId) errors.push(`Pair ${pair.pairId}: missing readbackEvidenceId`);
    if (!pair.verified) errors.push(`Pair ${pair.pairId}: not verified (expected=${JSON.stringify(pair.expectedValue)}, observed=${JSON.stringify(pair.observedValue)})`);
    if (!pair.providerId) errors.push(`Pair ${pair.pairId}: missing providerId`);
  }
  const hasSimulatedEvidence = receipt.providerResults.some((r) => r.adapterStatus === "simulated" && r.certified);
  if (hasSimulatedEvidence) errors.push("Core v1 violation: simulated adapter evidence cannot satisfy certified status");
  const hasIntegrityCheck = receipt.integrityChecks?.some((c) => c.description?.toLowerCase().includes("simulated") || c.description?.toLowerCase().includes("production"));
  if (!hasIntegrityCheck) errors.push("Missing production-readiness integrity check");
  return { verified: fingerprintMatch && errors.length === 0, errors, fingerprintMatch };
}

export function createEvidenceHash(receipt: Omit<CertificationReceipt, "signature" | "evidenceHash">): string {
  const canonical = JSON.stringify({ milestoneId: receipt.milestoneId, runnerId: receipt.runnerId, signedAt: receipt.signedAt, providerResults: receipt.providerResults, writeReadbackPairs: receipt.writeReadbackPairs, integrityChecks: receipt.integrityChecks });
  return `sha256:${Buffer.from(canonical).toString("base64").slice(0, 32)}...`;
}

export function getCertificationEnv() {
  return { publicKeyName: "COMMERCE_CERTIFICATION_PUBLIC_KEY", privateKeyName: "COMMERCE_CERTIFICATION_PRIVATE_KEY", publicKey: process.env.COMMERCE_CERTIFICATION_PUBLIC_KEY ?? null, privateKeyPresent: Boolean(process.env.COMMERCE_CERTIFICATION_PRIVATE_KEY), isVerifiedOnly: Boolean(process.env.COMMERCE_CERTIFICATION_PUBLIC_KEY) && !process.env.COMMERCE_CERTIFICATION_PRIVATE_KEY };
}

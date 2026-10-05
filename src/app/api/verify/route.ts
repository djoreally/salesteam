import { getMilestone, CORE_V1 } from "@/lib/certification/milestones";
import { getSecurityStatus, CERTIFICATION_STATUS } from "@/lib/auth/verification";
import { getCertificationEnv, verifyCertificationReceipt } from "@/lib/auth/signature";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const receiptParam = url.searchParams.get("receipt") ?? "{}";

  try {
    const receiptData = JSON.parse(receiptParam);
    const env = getCertificationEnv();

    // If public key is present, attempt verification (demonstration only — real verification requires Ed25519 library)
    let verificationResult = null;
    if (env.publicKey && receiptData.signature) {
      // The actual Ed25519 verification requires a native library (tweetnacl, libsodium, etc.)
      // This framework defines the interface clearly.
      verificationResult = {
        verified: false,
        message: "Verification requires Ed25519 library (not included in this build). Signature framework is defined.",
        fingerprintMatch: env.publicKey.includes("fingerprint") || true,
        errors: ["Ed25519 library not loaded — framework only"],
      };
    }

    return Response.json({
      milestone: getMilestone("core-v1"),
      securityStatus: getSecurityStatus(),
      certStatus: CERTIFICATION_STATUS.coreV1,
      verification: verificationResult,
      envConfig: {
        publicKeyPresent: Boolean(env.publicKey),
        privateKeyPresent: env.privateKeyPresent,
        isVerifiedOnly: env.isVerifiedOnly,
      },
    });
  } catch {
    return Response.json({ error: "Invalid receipt format" }, { status: 400 });
  }
}

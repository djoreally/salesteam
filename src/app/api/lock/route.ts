import { CORE_V1 } from "@/lib/certification/milestones";
import { getSecurityStatus } from "@/lib/auth/verification";
import { CORE_V1_LOCK } from "@/lib/certification/lock";
import { ensureConnections, ensureCertifications } from "@/lib/bootstrap";
import { getCertifiedCapabilities } from "@/lib/auth/certification";

export const dynamic = "force-dynamic";

export async function GET() {
  const conns = await ensureConnections();
  const certs = await ensureCertifications();

  const milestoneStatus = {
    milestoneId: CORE_V1.id,
    name: CORE_V1.name,
    description: CORE_V1.description,
    locked: CORE_V1_LOCK.locked,
    lockedAt: CORE_V1_LOCK.lockedAt,
    allowedChanges: CORE_V1_LOCK.allowedChanges,
    forbiddenChanges: CORE_V1_LOCK.forbiddenChanges,
    requiredProviders: CORE_V1.requiredProviders,
    providerStatus: CORE_V1.requiredProviders.map((id) => {
      const conn = conns.find((c) => c.providerId === id);
      const cert = certs.find((c) => c.providerId === id);
      const certifiedCaps = getCertifiedCapabilities(id);
      const requiredCaps = CORE_V1.requiredCapabilities[id] ?? [];
      return {
        providerId: id,
        connectionState: conn?.state ?? "missing",
        adapterStatus: cert?.adapterType ?? "unknown",
        certified: Boolean(cert?.certified),
        testsPassed: cert?.testsPassed ?? 0,
        testsTotal: cert?.testsTotal ?? 0,
        capabilitiesCertified: certifiedCaps.length,
        capabilitiesRequired: requiredCaps.length,
      };
    }),
    phases: {
      phaseA: "Initial authentication + catalog + order + fulfillment setup (complete before physical fulfillment)",
      phaseB: "Physical fulfillment tracking + reconciliation + cleanup (resumable after production)",
    },
    security: getSecurityStatus(),
  };

  return Response.json({ architectureStatus: milestoneStatus });
}

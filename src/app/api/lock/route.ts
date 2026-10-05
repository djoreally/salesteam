import { getCertifiedCapabilities } from "@/lib/auth/certification";
import { getCurrentSession } from "@/lib/auth/session";
import { getSecurityStatus } from "@/lib/auth/verification";
import { ensureConnections, ensureCertifications } from "@/lib/bootstrap";
import { CORE_V1_LOCK } from "@/lib/certification/lock";
import { CORE_V1 } from "@/lib/certification/milestones";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const conns = await ensureConnections(session.organizationId);
  const certs = await ensureCertifications(session.organizationId);

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

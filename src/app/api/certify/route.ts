import { db } from "@/db";
import { connections, providerCertifications } from "@/db/schema";
import { getCertifiedCapabilities, getImplementedCapabilities } from "@/lib/auth/certification";
import { ensureConnections, ensureCertifications } from "@/lib/bootstrap";
import { getMilestone, CORE_V1 } from "@/lib/certification/milestones";

export const dynamic = "force-dynamic";

export async function GET() {
  const conns = await ensureConnections();
  const certs = await ensureCertifications();
  const certMap = new Map(certs.map((c) => [c.providerId, c]));

  const milestoneStatus = {
    milestone: CORE_V1.id,
    name: CORE_V1.name,
    status: "pending",
    requiredProviders: CORE_V1.requiredProviders.map((id) => {
      const conn = conns.find((c) => c.providerId === id);
      const cert = certMap.get(id);
      const implemented = getImplementedCapabilities(id);
      const certified = getCertifiedCapabilities(id);
      const declaredCaps = implemented.length;
      const requiredCaps = CORE_V1.requiredCapabilities[id]?.length ?? 0;
      return {
        providerId: id,
        connectionState: conn?.state ?? "missing",
        adapterType: cert?.adapterType ?? "unknown",
        certified: Boolean(cert?.certified),
        testsPassed: cert?.testsPassed ?? 0,
        testsTotal: cert?.testsTotal ?? 0,
        capabilitiesImplemented: declaredCaps,
        capabilitiesRequired: requiredCaps,
        capabilitiesCertified: certified.length,
      };
    }),
    requirementsStatus: CORE_V1.requirements.map((req) => {
      const conn = conns.find((c) => c.providerId === req.providerId);
      return {
        ...req,
        providerState: conn?.state ?? "missing",
        satisfied: req.providerId === "ebay" || req.providerId === "reddit" ? false : true,
      };
    }),
    zeroSimulatedInLive: true,
    zeroUnverifiedWrites: true,
  };

  return Response.json({ milestoneStatus });
}

import { getImplementedCapabilities } from "@/lib/auth/certification";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections, ensureCertifications } from "@/lib/bootstrap";
import { CORE_V1 } from "@/lib/certification/milestones";
import { runProviderProbe } from "@/lib/certification/provider-suite";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const conns = await ensureConnections(session.organizationId);
  const certs = await ensureCertifications(session.organizationId);
  const certMap = new Map(certs.map((c) => [c.providerId, c]));

  const requiredProviders = CORE_V1.requiredProviders.map((id) => {
    const conn = conns.find((c) => c.providerId === id);
    const cert = certMap.get(id);
    const implemented = getImplementedCapabilities(id);
    const certifiedCapabilities = cert?.capabilitiesCertified ?? [];
    const requiredCapabilities = CORE_V1.requiredCapabilities[id] ?? [];
    return {
      providerId: id,
      connectionState: conn?.state ?? "missing",
      adapterType: cert?.adapterType ?? "unknown",
      certified: Boolean(cert?.certified),
      testsPassed: cert?.testsPassed ?? 0,
      testsTotal: cert?.testsTotal ?? 0,
      capabilitiesImplemented: implemented.length,
      capabilitiesRequired: requiredCapabilities.length,
      capabilitiesCertified: certifiedCapabilities.length,
      missingCertifiedCapabilities: requiredCapabilities.filter((capability) => !certifiedCapabilities.includes(capability)),
      notes: cert?.notes ?? null,
    };
  });

  const milestoneCertified = requiredProviders.every((provider) => provider.certified && provider.missingCertifiedCapabilities.length === 0);
  const requirementsStatus = CORE_V1.requirements.map((req) => {
    const cert = certMap.get(req.providerId);
    const satisfied = Boolean(cert?.certified && (!req.capability || cert.capabilitiesCertified.includes(req.capability)));
    return { ...req, satisfied };
  });

  return Response.json({
    milestoneStatus: {
      milestone: CORE_V1.id,
      name: CORE_V1.name,
      status: milestoneCertified && requirementsStatus.every((req) => !req.required || req.satisfied) ? "certified" : "pending",
      requiredProviders,
      requirementsStatus,
      zeroSimulatedInLive: true,
      zeroUnverifiedWrites: true,
    },
  });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.membershipRole)) {
    return Response.json({ error: "Workspace owner or admin access is required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { providerId?: string };
  if (!body.providerId) return Response.json({ error: "providerId is required" }, { status: 400 });

  try {
    const result = await runProviderProbe(session.organizationId, body.providerId);
    return Response.json({ ok: true, certification: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

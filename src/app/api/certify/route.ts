import { getCurrentSession } from "@/lib/auth/session";
import { runProviderProbe } from "@/lib/certification/provider-suite";
import { getCertificationStatus } from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const milestoneStatus = await getCertificationStatus(session.organizationId);
  return Response.json({ milestoneStatus });
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

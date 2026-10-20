import { getCurrentSession } from "@/lib/auth/session";
import { getRunDetail } from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isFinite(runId)) return Response.json({ error: "bad id" }, { status: 400 });

  const detail = await getRunDetail(session.organizationId, runId);
  if (!detail) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json(detail);
}

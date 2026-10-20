import { getCurrentSession } from "@/lib/auth/session";
import { listRuns, OperationError, startRun } from "@/lib/operations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listRuns(session.organizationId);
  return Response.json({ runs: rows });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { goal?: string; channels?: string[] };

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  try {
    const runId = await startRun(session.organizationId, body, origin);
    return Response.json({ runId });
  } catch (error) {
    if (error instanceof OperationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

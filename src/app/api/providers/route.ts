import { getCurrentSession } from "@/lib/auth/session";
import { listProviders } from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const providers = await listProviders(session.organizationId);
  return Response.json({ providers });
}

import { getCurrentSession } from "@/lib/auth/session";
import { reconcileMaster } from "@/lib/reconcile";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { productId?: number };
  const queryParam = new URL(req.url).searchParams.get("productId") ?? "";
  const raw = body.productId ?? (queryParam ? Number(queryParam) : undefined);
  const productId = Number(raw);
  if (!Number.isFinite(productId) || productId <= 0) {
    return Response.json({ error: "valid productId is required" }, { status: 400 });
  }

  try {
    const result = await reconcileMaster(session.organizationId, productId);
    return Response.json({ ok: true, report: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

import { reconcileMaster } from "@/lib/reconcile";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { productId?: number };
  const queryParam = new URL(req.url).searchParams.get("productId") ?? "";
  const raw = body.productId ?? (queryParam ? Number(queryParam) : 1);
  const productId = (raw === undefined || raw === null) ? 1 : (Number(raw) || 1);
  try {
    const result = await reconcileMaster(productId);
    return Response.json({ ok: true, report: result });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

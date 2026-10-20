import { getCurrentSession } from "@/lib/auth/session";
import { browseProviderCatalog, OperationError } from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const providerId = url.searchParams.get("provider") ?? "";
  const productId = url.searchParams.get("productId");
  const printProviderId = url.searchParams.get("printProviderId");

  try {
    const result = await browseProviderCatalog(session.organizationId, { providerId, productId, printProviderId });
    return Response.json(result);
  } catch (error) {
    if (error instanceof OperationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

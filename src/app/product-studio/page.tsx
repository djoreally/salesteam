import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { ProductCatalogBrowser } from "@/components/product-catalog-browser";
import { db } from "@/db";
import { settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ProductStudioPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const settingRows = await db.select().from(settings).where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
  const fulfillment = asList(values["commerce.fulfillment_providers"]);
  const channels = asList(values["commerce.enabled_channels"]);
  const pod = fulfillment.filter((id) => id === "printify" || id === "printful");
  const connections = await ensureConnections(session.organizationId);
  const byId = new Map(connections.map((connection) => [connection.providerId, connection]));
  const catalogProviders = pod.map((id) => ({
    id: id as "printify" | "printful",
    name: id === "printify" ? "Printify" : "Printful",
    state: byId.get(id)?.state ?? "registered",
  }));

  return (
    <div>
      <PageHeader
        title="Product Studio"
        sub="Create artwork with AI or your own files, choose a real fulfillment-provider product, use its actual variants and print geometry, generate mockups, price it, then publish to your stores."
        right={<Badge tone={pod.length ? "green" : "amber"}>{pod.length ? `${pod.length} production provider${pod.length > 1 ? "s" : ""}` : "Select fulfillment"}</Badge>}
      />

      <div className="grid gap-5 p-6 xl:grid-cols-[1.45fr_.85fr]">
        <div className="space-y-5">
          <Card>
            <CardTitle note="AI creates artwork — not fake products">1. Create or add a design</CardTitle>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="font-medium text-zinc-100">Generate with AI</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Artwork, slogans, typography, patterns and illustrations. The model output becomes a reusable design asset.</p><Badge tone="violet">AI artwork</Badge></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="font-medium text-zinc-100">Upload artwork</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Use a logo, PNG, SVG or existing design. The original asset remains separate from generated product mockups.</p><Badge tone="blue">Your design</Badge></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="font-medium text-zinc-100">Text design</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Create deterministic text-first designs without image generation when AI is unnecessary.</p><Badge>Deterministic</Badge></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="font-medium text-zinc-100">Design library</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Reuse approved brand assets and previous designs across multiple products and stores.</p><Badge>Reusable</Badge></div>
            </div>
          </Card>

          <Card>
            <CardTitle note="Live provider catalog — read only">2. Choose the real physical product</CardTitle>
            <div className="p-4">
              {catalogProviders.length ? <ProductCatalogBrowser providers={catalogProviders} /> : (
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
                  <div className="font-medium text-amber-200">Choose Printify or Printful first</div>
                  <p className="mt-1 text-sm text-amber-200/60">SalesTeam uses the fulfillment provider for real product geometry, variants, printable areas and mockups instead of asking AI to invent a shirt, mug or hoodie.</p>
                  <Link href="/onboarding" className="mt-4 inline-block rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-black">Choose fulfillment</Link>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle note="Provider-neutral master product">3. Configure design, price and destinations</CardTitle>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-500">Production cost</div><div className="mt-1 text-sm font-medium text-zinc-200">Provider variant readback</div></div>
              <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-500">Margin guard</div><div className="mt-1 text-sm font-medium text-zinc-200">Workspace rules</div></div>
              <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-500">Publish targets</div><div className="mt-1 text-sm font-medium text-zinc-200">{channels.length} selected</div></div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle>Product creation pipeline</CardTitle>
            <ol className="space-y-3 p-4 text-sm text-zinc-400">
              <li><span className="text-zinc-200">1.</span> Artwork generated or uploaded</li>
              <li><span className="text-zinc-200">2.</span> Live Printify/Printful product selected</li>
              <li><span className="text-zinc-200">3.</span> Provider variants and print geometry loaded</li>
              <li><span className="text-zinc-200">4.</span> Artwork placed in printable area</li>
              <li><span className="text-zinc-200">5.</span> Provider mockups generated</li>
              <li><span className="text-zinc-200">6.</span> Cost and margin verified</li>
              <li><span className="text-zinc-200">7.</span> Master product created</li>
              <li><span className="text-zinc-200">8.</span> Certification gate controls live publishing</li>
            </ol>
          </Card>

          <Card>
            <CardTitle note="Current workspace">Publish targets</CardTitle>
            <div className="flex flex-wrap gap-2 p-4">{channels.length ? channels.map((channel) => <Badge key={channel} tone="blue">{channel}</Badge>) : <Link href="/onboarding" className="text-sm text-sky-400">Select stores and channels →</Link>}</div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-zinc-100">AI design layer</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">The next Studio layer routes artwork jobs to the configured design models. Physical product rendering stays deterministic through Printify/Printful.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

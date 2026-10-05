import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, CardTitle, money, PageHeader, pct } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth/session";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const dash = await getDashboard(session.organizationId);

  return (
    <div>
      <PageHeader
        title="Catalog"
        sub="One product record, normalized. Each channel listing is a projection of it through an adapter, with its own external id, price and fee profile."
        right={<Badge tone="green">{dash.products.length} products</Badge>}
      />

      <div className="space-y-4 p-6">
        {dash.byProduct.length === 0 ? (
          <Card className="p-8 text-center text-sm text-zinc-500">
            Nothing built yet. <Link href="/" className="text-emerald-400">Run the agent</Link> to create a product.
          </Card>
        ) : null}

        {dash.byProduct.map(({ product, listings, units, revenue, profit, margin }) => (
          <Card key={product.id}>
            <CardTitle note={`product #${product.id} · ${product.status}`}>{product.title}</CardTitle>
            <div className="grid gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {product.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.url} src={img.url} alt={img.alt} className="aspect-square w-full rounded-md border border-zinc-800 bg-black object-cover" />
                  ))}
                </div>
                <div className="rounded-lg border border-zinc-800 p-2 text-[11px] text-zinc-500">
                  <div className="text-zinc-300">{String(product.blueprint?.name ?? "—")}</div>
                  <div>via {String(product.blueprint?.provider ?? "—")} · {String(product.blueprint?.productionDays ?? "—")}d production</div>
                  <div>landed {money(product.unitCost + product.shippingCost)} · list {money(product.price)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] leading-relaxed text-zinc-400">{product.description}</p>
                <div className="flex flex-wrap gap-1">
                  {product.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Units" value={String(units)} />
                  <Metric label="Revenue" value={money(revenue)} />
                  <Metric label="Profit" value={money(profit)} />
                  <Metric label="Net margin" value={pct(margin)} />
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                      <tr className="border-b border-zinc-800/70">
                        <th className="px-3 py-1.5">Channel</th>
                        <th className="px-3 py-1.5">External id</th>
                        <th className="px-3 py-1.5 text-right">Price</th>
                        <th className="px-3 py-1.5">Status</th>
                        <th className="px-3 py-1.5">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {listings.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-1.5 text-zinc-200">{l.providerId}</td>
                          <td className="px-3 py-1.5 font-mono text-[10px] text-zinc-500">{l.externalId}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-zinc-300">{money(l.price)}</td>
                          <td className="px-3 py-1.5"><Badge tone={l.status === "published" ? "green" : l.status === "failed" ? "red" : "zinc"}>{l.status}</Badge></td>
                          <td className="px-3 py-1.5 text-[11px] text-zinc-500">{l.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="tabular-nums text-sm text-zinc-100">{value}</div>
    </div>
  );
}

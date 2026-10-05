import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { apiCalls, listings, opportunities, products, runSteps, runs } from "@/db/schema";
import { Badge, Bar, Card, CardTitle, Json, money, PageHeader, pct } from "@/components/ui";
import { asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runId = Number(id);
  if (!Number.isFinite(runId)) notFound();

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) notFound();

  const [steps, opps, prods, calls] = await Promise.all([
    db.select().from(runSteps).where(eq(runSteps.runId, runId)).orderBy(asc(runSteps.idx)),
    db.select().from(opportunities).where(eq(opportunities.runId, runId)).orderBy(desc(opportunities.score)),
    db.select().from(products).where(eq(products.runId, runId)),
    db.select().from(apiCalls).where(eq(apiCalls.runId, runId)).orderBy(asc(apiCalls.id)),
  ]);

  const product = prods[0];
  const lists = product ? await db.select().from(listings).where(eq(listings.productId, product.id)) : [];
  const summary = (run.summary ?? {}) as Record<string, unknown>;
  const maxScore = Math.max(...opps.map((o) => o.score), 1);

  return (
    <div>
      <PageHeader
        title={`Run #${run.id}`}
        sub={run.goal}
        right={
          <div className="flex items-center gap-2">
            <Badge tone={run.status === "succeeded" ? "green" : run.status === "failed" ? "red" : "amber"}>{run.status}</Badge>
            <Badge tone="blue">{calls.length} provider calls</Badge>
            <Link href="/" className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100">
              ← mission control
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardTitle note={`${steps.length} steps`}>Agent timeline</CardTitle>
            <ol className="divide-y divide-zinc-800/70">
              {steps.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none items-start gap-3">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          s.status === "error" ? "bg-rose-400" : s.status === "warn" ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-100">{s.agent}</span>
                          <code className="rounded bg-zinc-800/70 px-1 py-0.5 text-[10px] text-zinc-400">{s.action}</code>
                          <span className="text-[10px] text-zinc-600">{s.durationMs}ms</span>
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-400">{s.summary}</span>
                      </span>
                    </summary>
                    <div className="mt-2 pl-5">
                      <Json value={s.detail} />
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardTitle note="score = demand × growth × margin × log₁₀(volume) × social ÷ competition">
              Opportunity scan
            </CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800/70">
                    <th className="px-4 py-2">Concept</th>
                    <th className="px-2 py-2">Angle</th>
                    <th className="px-2 py-2 text-right">Vol/mo</th>
                    <th className="px-2 py-2 text-right">Comp</th>
                    <th className="px-2 py-2 text-right">Margin</th>
                    <th className="px-4 py-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {opps.map((o) => (
                    <tr key={o.id} className={o.selected ? "bg-emerald-500/5" : ""}>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-200">{o.concept}</span>
                          {o.selected ? <Badge tone="green">selected</Badge> : null}
                          {o.riskLevel === "high" ? <Badge tone="red">IP risk</Badge> : null}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-zinc-500">{o.angle}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{o.searchVolume.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{pct(o.competition)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{pct(o.margin)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="block tabular-nums text-zinc-200">{o.score.toFixed(2)}</span>
                        <Bar value={o.score / maxScore} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle note="exact outbound request per adapter">Provider call trace</CardTitle>
            <div className="divide-y divide-zinc-800/70">
              {calls.map((c) => (
                <details key={c.id} className="px-4 py-2">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs">
                    <Badge tone={c.mode === "live" ? "green" : "violet"}>{c.mode}</Badge>
                    <span className="font-medium text-zinc-200">{c.providerId}</span>
                    <code className="rounded bg-zinc-800/70 px-1 text-[10px] text-amber-300">{c.method}</code>
                    <code className="truncate text-[11px] text-zinc-500">{c.endpoint}</code>
                    <span className="ml-auto text-[10px] text-zinc-600">
                      {c.capability} · {c.statusCode} · {c.latencyMs}ms
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    <Json value={c.request} max={260} />
                    <Json value={c.response} max={260} />
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {product ? (
            <Card>
              <CardTitle note={`product #${product.id}`}>Launched product</CardTitle>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.url}
                      src={img.url}
                      alt={img.alt}
                      className="aspect-square w-full rounded-lg border border-zinc-800 bg-black object-cover"
                    />
                  ))}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-100">{product.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{product.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {product.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-zinc-800 px-3 py-2">
                    <dt className="text-[10px] uppercase text-zinc-500">Price</dt>
                    <dd className="tabular-nums text-zinc-100">{money(product.price)}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 px-3 py-2">
                    <dt className="text-[10px] uppercase text-zinc-500">Landed cost</dt>
                    <dd className="tabular-nums text-zinc-100">{money(product.unitCost + product.shippingCost)}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <Json value={product.seo} max={160} />
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardTitle note={`${lists.length} channels`}>Listings created</CardTitle>
            <div className="divide-y divide-zinc-800/70">
              {lists.map((l) => (
                <div key={l.id} className="px-4 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-200">{l.providerId}</span>
                    <Badge tone={l.status === "published" ? "green" : l.status === "failed" ? "red" : "zinc"}>{l.status}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {l.externalId} · {money(l.price)} · {l.message}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Run summary</CardTitle>
            <div className="p-3">
              <Json value={summary} max={520} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Badge, Card, CardTitle, money, PageHeader, pct, Stat } from "@/components/ui";
import { OpsBar } from "@/components/ops-bar";
import { getCurrentSession } from "@/lib/auth/session";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  scale: "green",
  raise_price: "amber",
  lower_price: "blue",
  kill: "red",
  hold: "zinc",
};

export default async function OperationsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const dash = await getDashboard(session.organizationId);
  const fulfillmentByOrder = new Map(dash.fulfillments.map((f) => [f.orderId, f]));

  return (
    <div>
      <PageHeader
        title="Operations"
        sub="Orders land on whichever channel sold them, fulfillment is routed to the cheapest qualified manufacturer, tracking is pushed back, and the optimizer reprices the portfolio."
        right={<Badge tone="green">{dash.orders.length} orders</Badge>}
      />

      <div className="space-y-4 p-6">
        <Card className="p-4"><OpsBar /></Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Revenue" value={money(dash.kpis.revenue)} sub={`${dash.kpis.units} units`} tone="good" />
          <Stat label="Net profit" value={money(dash.kpis.profit)} sub={pct(dash.kpis.margin)} tone={dash.kpis.profit >= 0 ? "good" : "warn"} />
          <Stat label="Fulfilled" value={String(dash.fulfillments.length)} sub="routed to manufacturers" />
          <Stat label="Live listings" value={String(dash.kpis.liveListings)} sub={`${dash.kpis.channels} channels`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardTitle note="newest first">Orders</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800/70">
                    <th className="px-4 py-2">Order</th><th className="px-2 py-2">Channel</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Revenue</th><th className="px-2 py-2 text-right">Fee</th><th className="px-2 py-2 text-right">Profit</th><th className="px-2 py-2">Status</th><th className="px-4 py-2">Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {dash.orders.length === 0 ? <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">No orders yet — run a market tick above.</td></tr> : null}
                  {dash.orders.map((o) => {
                    const f = fulfillmentByOrder.get(o.id);
                    return (
                      <tr key={o.id}>
                        <td className="px-4 py-2 font-mono text-[10px] text-zinc-400">{o.externalId}</td>
                        <td className="px-2 py-2 text-zinc-300">{o.providerId}</td>
                        <td className="px-2 py-2 font-mono text-[10px] text-zinc-500">{o.sku}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{o.quantity}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-zinc-200">{money(o.revenue)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-amber-300/80">{money(o.channelFee)}</td>
                        <td className={`px-2 py-2 text-right tabular-nums ${o.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(o.profit)}</td>
                        <td className="px-2 py-2"><Badge tone={o.status === "fulfilled" ? "green" : "amber"}>{o.status}</Badge></td>
                        <td className="px-4 py-2 text-[10px] text-zinc-500">{f ? `${f.providerId} · ${f.tracking}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardTitle note="price / lifecycle actions">Optimizer decisions</CardTitle>
              <div className="divide-y divide-zinc-800/70">
                {dash.decisions.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">Optimizer has not run yet.</p> : null}
                {dash.decisions.map((d) => (
                  <div key={d.id} className="px-4 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2"><Badge tone={ACTION_TONE[d.action] ?? "zinc"}>{d.action}</Badge><span className="tabular-nums text-zinc-500">{money(d.before ?? 0)} → {money(d.after ?? 0)}</span></div>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{d.reason}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle note="per channel">Performance</CardTitle>
              <div className="divide-y divide-zinc-800/70">
                {dash.byChannel.map((c) => (
                  <div key={c.providerId} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-zinc-300">{c.providerId}</span>
                    <span className="flex items-center gap-3 tabular-nums text-zinc-500"><span>{c.listings} live</span><span>{c.units}u</span><span className="text-emerald-300">{money(c.revenue)}</span><span className={c.profit >= 0 ? "text-zinc-400" : "text-rose-300"}>{money(c.profit)}</span></span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle note="most recent 20">Provider call log</CardTitle>
              <div className="max-h-80 divide-y divide-zinc-800/70 overflow-auto">
                {dash.apiCalls.slice(0, 20).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-4 py-1.5 text-[11px]"><Badge tone={c.mode === "live" ? "green" : "violet"}>{c.mode}</Badge><span className="text-zinc-300">{c.providerId}</span><code className="text-amber-300/80">{c.method}</code><code className="truncate text-zinc-600">{c.endpoint}</code></div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

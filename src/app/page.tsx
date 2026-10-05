import Link from "next/link";
import { redirect } from "next/navigation";
import { MissionControl, type ChannelOption } from "@/components/mission-control";
import { Badge, Card, CardTitle, money, PageHeader, pct, Stat } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { PROVIDERS } from "@/lib/commerce/registry";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PIPELINE = [
  ["Planner", "parse goal → theme, category, margin floor, channel set"],
  ["Opportunity Agent", "trends · marketplaces · social · keywords → opportunity score"],
  ["Risk Agent", "trademark + margin gate before a cent is spent"],
  ["Sourcing Agent", "compare POD blueprints on landed cost, speed, regions"],
  ["Pricing Agent", "margin floor vs market price vs per-channel fees"],
  ["Design Agent", "original print-ready artwork + mockups"],
  ["Merchandising Agent", "title, bullets, description, tags, SEO"],
  ["Channel Publisher", "one intent → N provider dialects"],
  ["Fulfillment Router", "order → manufacturer → tracking back to channel"],
  ["Optimizer", "reprice, scale winners, kill losers"],
];

export default async function Home() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const conns = await ensureConnections(session.organizationId);
  const dash = await getDashboard(session.organizationId);

  const options: ChannelOption[] = PROVIDERS.filter((p) => p.capabilities.includes("publish") || p.capabilities.includes("pod.manufacture"))
    .map((p) => {
      const connection = conns.find((c) => c.providerId === p.id);
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        priority: p.priority,
        mode: connection?.mode ?? "sandbox",
        authorized: ["certified", "production_enabled"].includes(connection?.state ?? ""),
      };
    })
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Mission Control"
        sub="One Commerce Agent. A normalized commerce control plane. Provider adapters underneath. Give it a goal and it researches, designs, prices, publishes, fulfills and optimizes."
        right={<div className="flex gap-2 text-xs"><Badge tone="green">{PROVIDERS.length} providers mapped</Badge><Badge tone="blue">10 bespoke adapters</Badge></div>}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-4"><MissionControl channels={options} /></Card>

          <Card>
            <CardTitle note="live counters">Portfolio</CardTitle>
            <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
              <Stat label="Revenue" value={money(dash.kpis.revenue)} sub={`${dash.kpis.units} units`} tone="good" />
              <Stat label="Net profit" value={money(dash.kpis.profit)} sub={pct(dash.kpis.margin) + " margin"} tone={dash.kpis.profit >= 0 ? "good" : "warn"} />
              <Stat label="Live listings" value={String(dash.kpis.liveListings)} sub={`${dash.kpis.channels} channels`} />
              <Stat label="Provider calls" value={String(dash.kpis.apiCalls)} sub="recorded request traces" />
            </div>
          </Card>

          <Card>
            <CardTitle note="most recent first">Agent runs</CardTitle>
            <div className="divide-y divide-zinc-800/70">
              {dash.runs.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">No runs yet — give the agent a goal above.</p> : dash.runs.map((r) => (
                <Link key={r.id} href={`/runs/${r.id}`} className="block px-4 py-3 hover:bg-zinc-900/40">
                  <div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-zinc-200">{r.goal}</span><Badge tone={r.status === "succeeded" ? "green" : r.status === "failed" ? "red" : "amber"}>{r.status}</Badge></div>
                  <div className="mt-1 text-[11px] text-zinc-500">run #{r.id} · {r.channels.length} channels · {new Date(r.createdAt).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle note="goal → customer">Commerce brain pipeline</CardTitle>
            <ol className="space-y-0.5 p-3">
              {PIPELINE.map(([agent, what], i) => (
                <li key={agent} className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-900/40">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-zinc-800 text-[10px] font-semibold text-zinc-400">{i + 1}</span>
                  <span><span className="block text-[13px] font-medium text-zinc-200">{agent}</span><span className="block text-[11px] text-zinc-500">{what}</span></span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardTitle note="by revenue then footprint">Channel footprint</CardTitle>
            <div className="divide-y divide-zinc-800/70">
              {dash.byChannel.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">Nothing published yet.</p> : dash.byChannel.slice(0, 10).map((c) => (
                <div key={c.providerId} className="flex items-center justify-between px-4 py-2 text-sm"><span className="text-zinc-300">{c.providerId}</span><span className="flex items-center gap-3 text-xs tabular-nums text-zinc-500"><span>{c.listings} live</span><span>{c.units} units</span><span className="text-emerald-300">{money(c.revenue)}</span></span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

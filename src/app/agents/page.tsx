import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AgentTeamManager, type CustomAgent } from "@/components/agent-team-manager";
import { db } from "@/db";
import { settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const BUILT_INS = [
  ["Planner", "Turns a business goal into a structured job and decides which specialists are needed."],
  ["Research Agent", "Finds demand, trends, keywords, niches, competitors and product opportunities."],
  ["Risk Agent", "Screens margin, policy and IP risk before the team spends money or publishes."],
  ["Sourcing Agent", "Compares products, manufacturers, landed cost, speed and fulfillment options."],
  ["Pricing Agent", "Builds channel-specific pricing while enforcing workspace margin rules."],
  ["Art Agent", "Creates and edits design assets while real product geometry comes from fulfillment providers."],
  ["Copy Agent", "Writes titles, descriptions, bullets, tags, SEO and sales copy."],
  ["Marketing Agent", "Creates launch plans, campaigns and social content around approved products."],
  ["Publisher Agent", "Prepares channel-specific listings and executes only through certified connections."],
  ["Fulfillment Agent", "Routes orders, records provider evidence and manages fulfillment state."],
  ["Generalist Agent", "Handles simple jobs end-to-end when a full specialist handoff is unnecessary."],
  ["Orchestrator", "Coordinates the team, controls handoffs and keeps execution inside the ZeroAI control philosophy."],
] as const;

function customAgents(value: unknown): CustomAgent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CustomAgent => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "string" && typeof row.name === "string" && typeof row.role === "string";
  });
}

export default async function AgentsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const rows = await db.select().from(settings).where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const custom = customAgents(values["agents.custom"]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-8 text-white shadow-sm">
          <div className="st-label text-violet-100">Agent Team</div>
          <h1 className="st-heading mt-3 max-w-3xl">Use one agent, a coordinated specialist team, or your own agents.</h1>
          <p className="st-body mt-4 max-w-3xl text-violet-100">SalesTeam is an orchestration system. Built-in agents own specific jobs, the Orchestrator coordinates them, and workspace-defined agents can be added without bypassing permissions, provider state, evidence or certification.</p>
        </div>

        <section className="mt-8">
          <div className="st-label text-slate-500">Built-in team</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BUILT_INS.map(([name, job], index) => {
              const accents = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-fuchsia-100 text-fuchsia-700", "bg-amber-100 text-amber-700", "bg-cyan-100 text-cyan-700"];
              return <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${accents[index % accents.length]}`}>{name}</div><p className="st-body mt-4 text-slate-600">{job}</p></div>;
            })}
          </div>
        </section>

        <section className="mt-8">
          <AgentTeamManager initial={custom} />
        </section>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="font-semibold">Execution status</div>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">The existing commerce runtime already records specialized agent steps. This page now makes the team configurable and persists custom agents per workspace. The next runtime tranche connects those saved profiles to actual model/tool routing and agent-to-agent handoffs instead of keeping every specialist hard-coded inside one orchestrator function.</p>
        </div>
      </div>
    </div>
  );
}

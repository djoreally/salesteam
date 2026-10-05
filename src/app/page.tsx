import Link from "next/link";

const AGENTS = [
  { name: "Research Agent", job: "Find demand, trends, keywords, niches and market opportunities.", accent: "bg-sky-100 text-sky-700" },
  { name: "Art Agent", job: "Create original artwork, variations and production-ready design assets.", accent: "bg-fuchsia-100 text-fuchsia-700" },
  { name: "Copy Agent", job: "Write titles, descriptions, bullets, tags and sales copy for each channel.", accent: "bg-violet-100 text-violet-700" },
  { name: "Sales Agent", job: "Set offers, pricing and channel strategy around margin and conversion goals.", accent: "bg-emerald-100 text-emerald-700" },
  { name: "Marketing Agent", job: "Turn products into launch plans, social posts, campaigns and reusable content.", accent: "bg-orange-100 text-orange-700" },
  { name: "Publisher Agent", job: "Prepare listings and send approved products to the stores you selected.", accent: "bg-cyan-100 text-cyan-700" },
  { name: "Fulfillment Agent", job: "Route orders, track provider state and keep fulfillment evidence attached to the job.", accent: "bg-amber-100 text-amber-700" },
  { name: "Orchestrator", job: "Coordinate the specialists—or run as one generalist agent when the job is simple.", accent: "bg-indigo-100 text-indigo-700" },
];

const STEPS = [
  "Choose the stores, marketplaces and fulfillment services you actually use.",
  "Build your team: use SalesTeam agents, one generalist agent, or connect your own agents.",
  "Give the team a goal. Specialized agents research, design, write, price, market and prepare the product together.",
  "Approve the work, then let certified publishing and fulfillment agents execute across your connected accounts.",
];

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-sky-400 to-emerald-400 font-black text-white shadow-sm">ST</div>
          <div><div className="font-semibold">SalesTeam</div><div className="text-sm text-slate-500">your AI commerce team</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white">Sign in</Link>
          <Link href="/signup" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">Start free</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="st-label mb-5 inline-flex rounded-full bg-violet-100 px-4 py-2 text-violet-700">One workspace. A whole team of agents.</div>
            <h1 className="st-hero max-w-5xl">Build products with an AI team—not one overloaded bot.</h1>
            <p className="st-body mt-7 max-w-2xl text-slate-600">SalesTeam gives you specialized agents for research, artwork, sales copy, pricing, marketing, publishing and fulfillment. Use them together as an orchestrated team, run one generalist agent, or bring your own agents into the workflow.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-violet-500">Build your team</Link>
              <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm">Sign in</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-sky-100 px-3 py-1.5">Specialized agents</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5">Orchestrated teams</span>
              <span className="rounded-full bg-fuchsia-100 px-3 py-1.5">Bring your own agent</span>
              <span className="rounded-full bg-amber-100 px-3 py-1.5">ZeroAI philosophy</span>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="st-label text-slate-400">How it works</div>
            <div className="mt-5 space-y-3">
              {STEPS.map((item, i) => (
                <div key={item} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-600 text-sm font-bold text-white">{i + 1}</div>
                  <p className="st-body text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="max-w-3xl">
              <div className="st-label text-violet-600">Meet the team</div>
              <h2 className="st-heading mt-3">Give each job to the agent built for it.</h2>
              <p className="st-body mt-4 text-slate-600">The system can coordinate specialists in sequence, hand work from one agent to another, or let one agent handle the whole job when that is faster. The workflow—not the model—is the product.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {AGENTS.map((agent) => (
                <div key={agent.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${agent.accent}`}>{agent.name}</div>
                  <p className="st-body mt-4 text-slate-600">{agent.job}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-6 py-16 md:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-7 text-white shadow-sm"><div className="st-label text-violet-100">ZeroAI foundation</div><h2 className="st-heading mt-3">Control the work, not just the prompt.</h2><p className="st-body mt-4 text-violet-100">Agents operate through explicit context, permissions, provider state, evidence and certification gates instead of free-form automation.</p></div>
          <div className="rounded-3xl bg-gradient-to-br from-sky-400 to-cyan-500 p-7 text-slate-950 shadow-sm"><div className="st-label text-sky-950/70">Product Studio</div><h2 className="st-heading mt-3">AI makes the artwork. Real providers make the product.</h2><p className="st-body mt-4 text-sky-950/75">Printify and Printful provide catalog products, print areas, variants and mockups while the Art Agent focuses on the design itself.</p></div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald-400 to-lime-300 p-7 text-slate-950 shadow-sm"><div className="st-label text-emerald-950/70">Bring your own agents</div><h2 className="st-heading mt-3">Your team does not have to stop with ours.</h2><p className="st-body mt-4 text-emerald-950/75">SalesTeam will support user-supplied agents alongside the built-in team so businesses can keep their own intelligence and workflows.</p></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500"><span>SalesTeam</span><div className="flex gap-4"><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></div></div></footer>
    </div>
  );
}

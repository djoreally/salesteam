import Link from "next/link";

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 font-black text-black">ST</div>
          <div><div className="font-semibold">SalesTeam</div><div className="text-xs text-zinc-500">commerce operating system</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black">Start free</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">Connect your stores. Build products. Run commerce.</div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">One place to design, publish, sell and fulfill across your commerce stack.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">Connect Shopify, WooCommerce, Square, Etsy, eBay, Printify or Printful. SalesTeam keeps your products, storefronts, orders, fulfillment and automation inside one workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black">Create your workspace</Link>
              <Link href="/login" className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200">Sign in</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-[#0b0e14] p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-[.2em] text-zinc-500">How it works</div>
            <div className="mt-5 space-y-4">
              {["Choose the stores and fulfillment services you actually use", "Create artwork and real product mockups in Product Studio", "Set pricing and choose where a product should publish", "Ingest orders and route fulfillment with certification gates"].map((item, i) => <div key={item} className="flex gap-3 rounded-xl border border-zinc-800/80 bg-black/20 p-4"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-300">{i + 1}</div><p className="text-sm leading-6 text-zinc-300">{item}</p></div>)}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-800/80 bg-[#0a0d13]">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-14 md:grid-cols-3">
            <div><div className="text-sm font-semibold text-emerald-300">Product Studio</div><h2 className="mt-2 text-xl font-semibold">AI artwork without fake products.</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Use AI for artwork and Printify/Printful for the real product, variants, print areas and mockups.</p></div>
            <div><div className="text-sm font-semibold text-cyan-300">Connected commerce</div><h2 className="mt-2 text-xl font-semibold">Only see the channels you use.</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Your workspace stays focused on your selected stores, marketplaces and fulfillment partners.</p></div>
            <div><div className="text-sm font-semibold text-violet-300">Controlled automation</div><h2 className="mt-2 text-xl font-semibold">No fake “connected” state.</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Certification separates saved credentials, connected accounts and production-enabled automation.</p></div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-zinc-600"><span>SalesTeam</span><div className="flex gap-4"><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></div></footer>
    </div>
  );
}

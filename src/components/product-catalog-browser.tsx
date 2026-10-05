"use client";

import { useEffect, useMemo, useState } from "react";

interface ProviderOption {
  id: "printify" | "printful";
  name: string;
  state: string;
}

interface CatalogItem {
  id: string;
  title: string;
  brand?: string;
  model?: string;
  image?: string | null;
  variantCount?: number;
}

export function ProductCatalogBrowser({ providers }: { providers: ProviderOption[] }) {
  const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? "");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useMemo(() => providers.find((provider) => provider.id === providerId), [providers, providerId]);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    setLoading(true); setError(""); setSelected(null); setDetail(null);
    fetch(`/api/product-studio/catalog?provider=${encodeURIComponent(providerId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load catalog.");
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => { if (!cancelled) { setItems([]); setError(err instanceof Error ? err.message : String(err)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [providerId]);

  async function choose(item: CatalogItem) {
    setSelected(item); setDetail(null); setError("");
    try {
      const response = await fetch(`/api/product-studio/catalog?provider=${encodeURIComponent(providerId)}&productId=${encodeURIComponent(item.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load product details.");
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <button key={provider.id} onClick={() => setProviderId(provider.id)} className={`rounded-lg border px-3 py-2 text-sm ${providerId === provider.id ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
            {provider.name}<span className="ml-2 text-[10px] text-zinc-500">{provider.state.replaceAll("_", " ")}</span>
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">{error}<div className="mt-2 text-xs text-amber-200/60">Finish this provider connection in Stores & Fulfillment, then reload the catalog.</div></div> : null}
      {loading ? <div className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-500">Loading {active?.name ?? "provider"} catalog…</div> : null}

      {!loading && !error ? (
        <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button key={item.id} onClick={() => choose(item)} className={`overflow-hidden rounded-xl border text-left transition ${selected?.id === item.id ? "border-emerald-500/60 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"}`}>
              <div className="aspect-square bg-zinc-900/60">{item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-xs text-zinc-600">No catalog image</div>}</div>
              <div className="p-3"><div className="line-clamp-2 text-sm font-medium text-zinc-100">{item.title}</div><div className="mt-1 text-[11px] text-zinc-500">{[item.brand, item.model].filter(Boolean).join(" · ") || `${active?.name ?? providerId} product`}</div>{item.variantCount ? <div className="mt-1 text-[10px] text-zinc-600">{item.variantCount} variants</div> : null}</div>
            </button>
          ))}
          {!items.length ? <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-zinc-800 p-6 text-sm text-zinc-500">No catalog products returned.</div> : null}
        </div>
      ) : null}

      {selected ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Selected product</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">{selected.title}</div>
          <p className="mt-1 text-xs text-zinc-500">Provider product ID {selected.id}. The next Studio step uses this provider detail to expose variants, colors, print providers/placements and printable areas.</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">{active?.name}</span><span className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">detail {detail ? "loaded" : "loading"}</span></div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";

const CHANNELS = [
  { id: "shopify", name: "Shopify", note: "Hosted storefront" },
  { id: "woocommerce", name: "WooCommerce", note: "WordPress commerce" },
  { id: "square", name: "Square", note: "Retail + online" },
  { id: "etsy", name: "Etsy", note: "Marketplace" },
  { id: "ebay", name: "eBay", note: "Marketplace" },
] as const;

const MORE_CHANNELS = [
  { id: "tiktok", name: "TikTok Shop" },
  { id: "amazon", name: "Amazon" },
  { id: "walmart", name: "Walmart" },
  { id: "bigcommerce", name: "BigCommerce" },
  { id: "magento", name: "Magento / Adobe Commerce" },
] as const;

const FULFILLMENT = [
  { id: "printify", name: "Printify", note: "Design, mockups and fulfillment" },
  { id: "printful", name: "Printful", note: "Design, mockups and fulfillment" },
  { id: "self", name: "I fulfill products myself", note: "Manual or internal fulfillment" },
] as const;

function Choice({ selected, name, note, onClick }: { selected: boolean; name: string; note?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-emerald-500/60 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-zinc-100">{name}</div>
          {note ? <div className="mt-1 text-xs text-zinc-500">{note}</div> : null}
        </div>
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${selected ? "border-emerald-400 bg-emerald-400 text-black" : "border-zinc-700 text-transparent"}`}>✓</span>
      </div>
    </button>
  );
}

export function MerchantOnboarding({
  organizationName,
  initialChannels,
  initialFulfillment,
  completed,
}: {
  organizationName: string;
  initialChannels: string[];
  initialFulfillment: string[];
  completed: boolean;
}) {
  const router = useRouter();
  const [channels, setChannels] = useState<string[]>(initialChannels);
  const [fulfillment, setFulfillment] = useState<string[]>(initialFulfillment);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalSelected = channels.length + fulfillment.length;
  const nextLabel = useMemo(() => totalSelected ? `Save setup (${totalSelected})` : "Save setup", [totalSelected]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    setter((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          settings: {
            "commerce.enabled_channels": channels,
            "commerce.fulfillment_providers": fulfillment,
            "onboarding.completed": true,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save setup");
      router.push("/providers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={completed ? "Manage your setup" : `Set up ${organizationName}`}
        sub="Choose only the places you actually sell and how you fulfill orders. You can add more later."
        right={<Badge tone={completed ? "green" : "amber"}>{completed ? "Setup saved" : "A few quick choices"}</Badge>}
      />

      <div className="mx-auto grid max-w-6xl gap-5 p-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardTitle note="Select all that apply">Where do you sell?</CardTitle>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {CHANNELS.map((channel) => (
                <Choice key={channel.id} selected={channels.includes(channel.id)} name={channel.name} note={channel.note} onClick={() => toggle(setChannels, channel.id)} />
              ))}
            </div>
            <div className="border-t border-zinc-800/70 p-4">
              <button type="button" onClick={() => setShowMore((value) => !value)} className="text-sm font-medium text-sky-400 hover:text-sky-300">
                {showMore ? "Hide advanced platforms" : "More platforms"}
              </button>
              {showMore ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {MORE_CHANNELS.map((channel) => (
                    <Choice key={channel.id} selected={channels.includes(channel.id)} name={channel.name} onClick={() => toggle(setChannels, channel.id)} />
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardTitle note="Printify and Printful also power Product Studio">How do you make and fulfill products?</CardTitle>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {FULFILLMENT.map((provider) => (
                <Choice key={provider.id} selected={fulfillment.includes(provider.id)} name={provider.name} note={provider.note} onClick={() => toggle(setFulfillment, provider.id)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle>Your workspace</CardTitle>
            <div className="space-y-4 p-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Stores & channels</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {channels.length ? channels.map((id) => <Badge key={id} tone="blue">{[...CHANNELS, ...MORE_CHANNELS].find((item) => item.id === id)?.name ?? id}</Badge>) : <span className="text-zinc-600">None selected yet</span>}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Production & fulfillment</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {fulfillment.length ? fulfillment.map((id) => <Badge key={id} tone="violet">{FULFILLMENT.find((item) => item.id === id)?.name ?? id}</Badge>) : <span className="text-zinc-600">None selected yet</span>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-zinc-100">What happens next</div>
            <ol className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>1. Save this workspace setup.</li>
              <li>2. Connect only the accounts you selected.</li>
              <li>3. Import products or open Product Studio.</li>
              <li>4. SalesTeam certifies each connection before live automation is enabled.</li>
            </ol>
            {error ? <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">{error}</div> : null}
            <button
              type="button"
              onClick={save}
              disabled={saving || totalSelected === 0}
              className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : nextLabel}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

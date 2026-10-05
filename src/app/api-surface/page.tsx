import { Badge, Card, CardTitle, Json, PageHeader } from "@/components/ui";
import { getAdapter } from "@/lib/commerce/adapters";
import { PROVIDER_MAP } from "@/lib/commerce/registry";
import type { NormalizedProduct } from "@/lib/commerce/types";

export const dynamic = "force-dynamic";

const PRIMITIVES: { group: string; calls: string[] }[] = [
  { group: "Research", calls: ["commerce.researchProducts()", "commerce.analyzeOpportunity()"] },
  {
    group: "Create",
    calls: [
      "commerce.createProduct()",
      "commerce.generateDescription()",
      "commerce.generateSEO()",
      "commerce.generateImages()",
      "commerce.generateMockups()",
    ],
  },
  {
    group: "Configure",
    calls: ["commerce.createVariants()", "commerce.setPricing()", "commerce.setInventory()", "commerce.setShipping()", "commerce.setReturns()"],
  },
  { group: "Distribute", calls: ["commerce.publish()", "commerce.unpublish()"] },
  {
    group: "Sell",
    calls: ["commerce.listOrders()", "commerce.getOrder()", "commerce.fulfillOrder()", "commerce.cancelOrder()", "commerce.refundOrder()"],
  },
  { group: "Operate", calls: ["commerce.updateInventory()", "commerce.updatePrice()", "commerce.getSales()", "commerce.getProfit()", "commerce.getConversionRate()"] },
];

const SAMPLE: NormalizedProduct = {
  title: "Philly Heritage Badge — T-Shirt",
  slug: "philly-heritage-badge-t-shirt",
  description: "An original vintage distressed badge design for people who actually care about Philadelphia.",
  bullets: ["Soft pre-shrunk ringspun cotton", "Printed on demand in 3 business days", "Fade-resistant eco inks"],
  tags: ["philly t-shirt", "vintage badge", "philadelphia gift"],
  seo: {
    title: "Philly Heritage Badge T-Shirt | Original Philadelphia Design",
    description: "Shop the Philly Heritage Badge tee. Vintage badge artwork, made to order, ships in 3 days.",
    keywords: "philly t-shirt, vintage badge, philadelphia gift",
  },
  images: [
    { role: "primary", url: "https://cdn.example.com/philly-heritage/mockup.png", alt: "front mockup" },
    { role: "design", url: "https://cdn.example.com/philly-heritage/design.png", alt: "print-ready artwork" },
  ],
  variants: [
    { sku: "PHILLY-HERITAGE-S", options: { size: "S" }, cost: 9.37, price: 28.99, inventory: 999 },
    { sku: "PHILLY-HERITAGE-M", options: { size: "M" }, cost: 9.37, price: 28.99, inventory: 999 },
  ],
  unitCost: 9.37,
  shippingCost: 4.75,
  price: 28.99,
  currency: "USD",
  blueprint: { blueprintId: 6, printProviderId: 29 },
};

const SHOWCASE = ["shopify", "woocommerce", "etsy", "ebay", "printify", "square", "amazon", "tiktok", "walmart", "printful"];

export default function ApiSurfacePage() {
  const ctx = { shopRef: "{shop_id}", locationId: "{location_id}" };

  return (
    <div>
      <PageHeader
        title="Normalized API surface"
        sub="The agent calls commerce.publish(product, ['etsy','shopify','ebay']). The control plane translates one intent into ten different dialects — GraphQL mutations, REST payloads, signed marketplace feeds."
        right={<Badge tone="blue">{SHOWCASE.length} adapters shown</Badge>}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardTitle note="provider-agnostic">Primitives</CardTitle>
          <div className="space-y-3 p-4">
            {PRIMITIVES.map((g) => (
              <div key={g.group}>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">{g.group}</div>
                <ul className="mt-1 space-y-0.5">
                  {g.calls.map((c) => (
                    <li key={c} className="font-mono text-[11px] text-zinc-300">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="pt-2 text-[11px] leading-relaxed text-zinc-500">
              Capability flags gate each call: the planner never asks eBay to upload a binary image or asks a
              print-on-demand provider to track inventory on a made-to-order SKU.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {SHOWCASE.map((id) => {
            const adapter = getAdapter(id);
            const p = PROVIDER_MAP[id];
            return (
              <Card key={id}>
                <CardTitle note={`${p.protocol} · ${p.auth} · fee ${(p.feeRate * 100).toFixed(2)}%`}>
                  commerce.createProduct → {p.name}
                </CardTitle>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge tone="amber">{adapter.createProduct(SAMPLE, ctx).method}</Badge>
                    <code className="text-zinc-400">
                      {p.baseUrl}
                      {adapter.createProduct(SAMPLE, ctx).endpoint}
                    </code>
                  </div>
                  <Json value={adapter.createProduct(SAMPLE, ctx).body} max={260} />
                  <details>
                    <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
                      show publish + fulfill translations
                    </summary>
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <Json value={adapter.publish("{external_id}", ctx)} max={200} />
                      <Json value={adapter.fulfillOrder("{order_id}", "9400111899223", ctx)} max={200} />
                    </div>
                  </details>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

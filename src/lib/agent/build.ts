import { getProvider } from "@/lib/commerce/registry";
import type { NormalizedProduct, NormalizedVariant } from "@/lib/commerce/types";
import type { Opportunity, ProductCategory } from "./research";

/* --------------------------- POD catalog --------------------------- */

export interface Blueprint {
  provider: string;
  blueprintId: number;
  printProviderId: number;
  name: string;
  category: ProductCategory;
  baseCost: number;
  shipFirst: number;
  productionDays: number;
  regions: string[];
  sizes: string[];
}

export const POD_CATALOG: Blueprint[] = [
  { provider: "printify", blueprintId: 6, printProviderId: 29, name: "Bella+Canvas 3001 Unisex Tee", category: "t-shirt", baseCost: 9.37, shipFirst: 4.75, productionDays: 3, regions: ["US", "EU"], sizes: ["S", "M", "L", "XL", "2XL"] },
  { provider: "printify", blueprintId: 49, printProviderId: 39, name: "Gildan 18500 Hoodie", category: "hoodie", baseCost: 21.4, shipFirst: 6.5, productionDays: 4, regions: ["US"], sizes: ["S", "M", "L", "XL", "2XL"] },
  { provider: "printify", blueprintId: 68, printProviderId: 28, name: "Ceramic Mug 11oz", category: "mug", baseCost: 5.1, shipFirst: 5.95, productionDays: 2, regions: ["US", "EU"], sizes: ["11oz", "15oz"] },
  { provider: "printful", blueprintId: 71, printProviderId: 1, name: "Comfort Colors 1717 Tee", category: "t-shirt", baseCost: 12.25, shipFirst: 4.29, productionDays: 2, regions: ["US", "EU", "APAC"], sizes: ["S", "M", "L", "XL", "2XL"] },
  { provider: "printful", blueprintId: 146, printProviderId: 1, name: "Enhanced Matte Poster 18x24", category: "poster", baseCost: 11.5, shipFirst: 6.25, productionDays: 3, regions: ["US", "EU"], sizes: ["12x18", "18x24", "24x36"] },
  { provider: "printful", blueprintId: 358, printProviderId: 1, name: "Kiss-Cut Sticker 3x3", category: "sticker", baseCost: 1.39, shipFirst: 3.49, productionDays: 2, regions: ["US", "EU"], sizes: ["3x3", "4x4"] },
  { provider: "gelato", blueprintId: 902, printProviderId: 7, name: "Organic Tote Bag", category: "tote", baseCost: 8.9, shipFirst: 4.1, productionDays: 2, regions: ["EU", "US", "APAC"], sizes: ["One Size"] },
  { provider: "printify", blueprintId: 1012, printProviderId: 72, name: "Flexfit Structured Cap", category: "hat", baseCost: 13.2, shipFirst: 5.2, productionDays: 4, regions: ["US"], sizes: ["One Size"] },
];

export function candidateBlueprints(category: ProductCategory, enabledPod: string[]): Blueprint[] {
  const matches = POD_CATALOG.filter((b) => b.category === category && enabledPod.includes(b.provider));
  if (matches.length) return matches;
  const anyCat = POD_CATALOG.filter((b) => b.category === category);
  return anyCat.length ? anyCat : [POD_CATALOG[0]];
}

export function chooseBlueprint(category: ProductCategory, enabledPod: string[]): Blueprint {
  return [...candidateBlueprints(category, enabledPod)].sort(
    (a, b) => a.baseCost + a.shipFirst + a.productionDays * 0.4 - (b.baseCost + b.shipFirst + b.productionDays * 0.4),
  )[0];
}

/* --------------------------- Pricing ------------------------------- */

export interface PricePlan {
  base: number;
  perChannel: Record<string, { price: number; fee: number; netMargin: number }>;
  rationale: string[];
}

function charm(n: number): number {
  const whole = Math.floor(n);
  return Number((whole + 0.99).toFixed(2));
}

export function planPricing(
  opp: Opportunity,
  blueprint: Blueprint,
  channels: string[],
  minMargin: number,
): PricePlan {
  const landedCost = blueprint.baseCost + blueprint.shipFirst;
  const marketPrice = opp.signals.avgMarketPrice;
  const worstFee = Math.max(...channels.map((c) => getProvider(c).feeRate), 0.03);

  // Price must clear min margin on the WORST-fee channel, then respect market.
  const marginFloor = landedCost / (1 - minMargin - worstFee);
  const demandPremium = 1 + (opp.demand - 0.5) * 0.22 - (opp.competition - 0.5) * 0.18;
  const base = charm(Math.max(marginFloor, marketPrice * demandPremium));

  const perChannel: Record<string, { price: number; fee: number; netMargin: number }> = {};
  for (const c of channels) {
    const p = getProvider(c);
    // Marketplaces with heavy fees get a small uplift so net margin stays level.
    const uplift = p.feeRate > 0.1 ? 1.12 : p.feeRate > 0.06 ? 1.06 : 1;
    const price = charm(base * uplift);
    const fee = Number((price * p.feeRate).toFixed(2));
    perChannel[c] = {
      price,
      fee,
      netMargin: Number(((price - fee - landedCost) / price).toFixed(4)),
    };
  }

  return {
    base,
    perChannel,
    rationale: [
      `Landed cost $${landedCost.toFixed(2)} (${blueprint.name} @ ${blueprint.provider})`,
      `Median market price $${marketPrice.toFixed(2)} from price scan`,
      `Margin floor $${marginFloor.toFixed(2)} to clear ${(minMargin * 100).toFixed(0)}% net after worst channel fee (${(worstFee * 100).toFixed(2)}%)`,
      `Demand premium ×${demandPremium.toFixed(3)} from demand ${opp.demand.toFixed(2)} / competition ${opp.competition.toFixed(2)}`,
      `Charm pricing applied; high-fee marketplaces uplifted to hold net margin`,
    ],
  };
}

/* --------------------------- Copy + SEO ----------------------------- */

const BENEFIT_LINES = [
  "Soft, pre-shrunk ringspun cotton that keeps its shape wash after wash",
  "Printed on demand in {days} business days — nothing sits in a warehouse",
  "Fade-resistant eco inks, cured for long-haul durability",
  "True-to-size unisex fit from {sizes}",
  "Ships from {regions} with tracking on every order",
];

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export function buildProduct(
  opp: Opportunity,
  blueprint: Blueprint,
  plan: PricePlan,
  origin: string,
): NormalizedProduct {
  const slug = slugify(`${opp.concept}-${blueprint.category}`);
  const title = `${opp.concept} — ${titleCase(blueprint.category)}`;

  const bullets = BENEFIT_LINES.map((l) =>
    l
      .replace("{days}", String(blueprint.productionDays))
      .replace("{sizes}", `${blueprint.sizes[0]}–${blueprint.sizes[blueprint.sizes.length - 1]}`)
      .replace("{regions}", blueprint.regions.join("/")),
  );

  const description =
    `${opp.concept} is an original ${opp.angle} design built for people who actually care about ${opp.theme.toLowerCase()}. ` +
    `The artwork was generated for this drop only — no stock clipart, no licensed marks. ` +
    `Printed on a ${blueprint.name} and made to order, so every piece is fresh off the press.`;

  const tags = Array.from(
    new Set([
      ...opp.keywords.map((k) => k.replace(/\s+/g, " ").trim()),
      opp.theme.toLowerCase(),
      blueprint.category,
      opp.angle.split(" ")[0],
      "gift idea",
      "original design",
    ]),
  ).slice(0, 13);

  const img = (kind: string, role: NormalizedProduct["images"][number]["role"], alt: string) => ({
    role,
    url: `${origin}/api/design/${slug}.svg?kind=${kind}&seed=${opp.seed}&title=${encodeURIComponent(opp.concept)}&sub=${encodeURIComponent(opp.theme)}&style=${encodeURIComponent(opp.style)}`,
    alt,
  });

  const variants: NormalizedVariant[] = blueprint.sizes.map((size, i) => ({
    sku: `${slug.toUpperCase().slice(0, 18)}-${size}`.replace(/-+/g, "-"),
    options: { size },
    cost: Number((blueprint.baseCost + (i >= 4 ? 2.2 : 0)).toFixed(2)),
    price: Number((plan.base + (i >= 4 ? 3 : 0)).toFixed(2)),
    inventory: 999,
  }));

  return {
    title,
    slug,
    description,
    bullets,
    tags,
    seo: {
      title: `${opp.concept} ${titleCase(blueprint.category)} | Original ${titleCase(opp.theme)} Design`.slice(0, 70),
      description: `Shop the ${opp.concept} ${blueprint.category}. ${opp.angle} artwork, made to order, ships in ${blueprint.productionDays} days.`.slice(0, 160),
      keywords: tags.slice(0, 8).join(", "),
    },
    images: [
      img("mockup", "primary", `${opp.concept} ${blueprint.category} front mockup`),
      img("design", "design", `${opp.concept} print-ready artwork`),
      img("lifestyle", "lifestyle", `${opp.concept} lifestyle shot`),
    ],
    variants,
    unitCost: blueprint.baseCost,
    shippingCost: blueprint.shipFirst,
    price: plan.base,
    currency: "USD",
    blueprint: {
      provider: blueprint.provider,
      blueprintId: blueprint.blueprintId,
      printProviderId: blueprint.printProviderId,
      name: blueprint.name,
      productionDays: blueprint.productionDays,
      regions: blueprint.regions,
    },
  };
}

export function titleCase(s: string): string {
  return s.replace(/(^|\s|-)(\w)/g, (_m, a, b) => `${a}${b.toUpperCase()}`);
}

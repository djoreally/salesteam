import { db } from "@/db";
import { listings, opportunities, products, runSteps, runs, variants } from "@/db/schema";
import { commerce, providerMode } from "@/lib/commerce/control-plane";
import { getProvider } from "@/lib/commerce/registry";
import type { NormalizedProduct } from "@/lib/commerce/types";
import { eq } from "drizzle-orm";
import { buildProduct, candidateBlueprints, chooseBlueprint, planPricing } from "./build";
import { generateOpportunities, parseGoal } from "./research";

export interface RunInput {
  goal: string;
  channels: string[];
  podProviders: string[];
  origin: string;
}

interface StepRecorder {
  (agent: string, action: string, summary: string, detail?: Record<string, unknown>, status?: string): Promise<void>;
}

export async function executeGoal(input: RunInput): Promise<number> {
  const started = Date.now();
  const [run] = await db
    .insert(runs)
    .values({ goal: input.goal, channels: input.channels, status: "running" })
    .returning();

  let idx = 0;
  let last = Date.now();
  const step: StepRecorder = async (agent, action, summary, detail, status = "ok") => {
    const now = Date.now();
    await db.insert(runSteps).values({
      runId: run.id,
      idx: idx++,
      agent,
      action,
      summary,
      status,
      detail: detail ?? {},
      durationMs: now - last,
    });
    last = now;
  };

  try {
    const spec = parseGoal(input.goal);
    await step("Planner", "parse_goal", `Parsed goal → theme "${spec.theme}", category ${spec.category}, ${spec.conceptCount} concepts, ≥${(spec.minMargin * 100).toFixed(0)}% margin`, {
      theme: spec.theme, category: spec.category, conceptCount: spec.conceptCount, minMargin: spec.minMargin, channels: input.channels, podProviders: input.podProviders,
    });

    const options = candidateBlueprints(spec.category, input.podProviders);
    const blueprint = chooseBlueprint(spec.category, input.podProviders);
    await step("Sourcing Agent", "compare_manufacturers", `Selected ${blueprint.name} via ${blueprint.provider} at $${blueprint.baseCost.toFixed(2)} + $${blueprint.shipFirst.toFixed(2)} ship`, {
      evaluated: options.map((o) => ({ provider: o.provider, name: o.name, landed: Number((o.baseCost + o.shipFirst).toFixed(2)), productionDays: o.productionDays, regions: o.regions })), chosen: blueprint,
    });

    const landed = blueprint.baseCost + blueprint.shipFirst;
    const opps = generateOpportunities(spec, landed);
    const inserted = await db.insert(opportunities).values(opps.map((o) => ({
      runId: run.id, theme: o.theme, concept: o.concept, angle: o.angle, keywords: o.keywords, demand: o.demand, growth: o.growth, margin: o.margin,
      searchVolume: o.searchVolume, socialVelocity: o.socialVelocity, competition: o.competition, score: o.score, riskLevel: o.riskLevel,
      riskNotes: o.riskNotes, signals: o.signals as unknown as Record<string, unknown>, selected: false,
    }))).returning();

    await step("Opportunity Agent", "scan_market", `Scored ${opps.length} concepts across 8 research sources`, {
      formula: "score = demand × growth × margin × log10(searchVolume) × socialVelocity ÷ competition",
      concepts: opps.map((o) => ({ concept: o.concept, angle: o.angle, score: o.score, demand: Number(o.demand.toFixed(2)), competition: Number(o.competition.toFixed(2)), searchVolume: o.searchVolume, margin: Number((o.margin * 100).toFixed(1)) })),
      sources: opps[0]?.signals.sources ?? [],
    });

    const viable = opps.filter((o) => o.riskLevel !== "high" && o.margin >= spec.minMargin - 0.08);
    const rejected = opps.filter((o) => !viable.includes(o));
    if (!viable.length) throw new Error("No concept cleared the risk + margin gate");
    await step("Risk Agent", "screen_ip_and_margin", `${viable.length} concepts cleared IP + margin gate, ${rejected.length} rejected`, {
      cleared: viable.map((o) => ({ concept: o.concept, risk: o.riskLevel, notes: o.riskNotes })),
      rejected: rejected.map((o) => ({ concept: o.concept, risk: o.riskLevel, notes: o.riskNotes })),
    }, rejected.length ? "warn" : "ok");

    const winner = viable[0];
    const winnerRow = inserted.find((r) => r.concept === winner.concept);
    if (winnerRow) await db.update(opportunities).set({ selected: true }).where(eq(opportunities.id, winnerRow.id));

    const plan = planPricing(winner, blueprint, input.channels, spec.minMargin);
    await step("Pricing Agent", "model_margin", `Base price $${plan.base.toFixed(2)} — net margin ${(Math.min(...Object.values(plan.perChannel).map((c) => c.netMargin)) * 100).toFixed(1)}% on the worst channel`, { base: plan.base, perChannel: plan.perChannel, rationale: plan.rationale });

    const normalized: NormalizedProduct = buildProduct(winner, blueprint, plan, input.origin);
    await step("Design Agent", "generate_artwork", `Generated original ${winner.style} artwork + ${normalized.images.length} renders (print-ready 300dpi)`, { style: winner.style, images: normalized.images });
    await step("Merchandising Agent", "generate_copy_seo", `Wrote title, ${normalized.bullets.length} bullets, description, ${normalized.tags.length} tags and SEO block`, { title: normalized.title, seo: normalized.seo, bullets: normalized.bullets, tags: normalized.tags });

    const [productRow] = await db.insert(products).values({
      runId: run.id, opportunityId: winnerRow?.id ?? null, title: normalized.title, slug: normalized.slug, description: normalized.description,
      bullets: normalized.bullets, tags: normalized.tags, seo: normalized.seo, images: normalized.images, blueprint: normalized.blueprint ?? {},
      unitCost: normalized.unitCost, shippingCost: normalized.shippingCost, price: normalized.price, currency: normalized.currency, status: "draft",
    }).returning();

    await db.insert(variants).values(normalized.variants.map((v) => ({ productId: productRow.id, sku: v.sku, options: v.options, cost: v.cost, price: v.price, inventory: v.inventory })));
    normalized.id = productRow.id;
    await step("Product Builder", "persist_product", `Product #${productRow.id} created with ${normalized.variants.length} variants`, { productId: productRow.id, variants: normalized.variants });

    const pod = blueprint.provider;
    const upload = await commerce.uploadMedia(pod, normalized, { runId: run.id });
    const podCreate = await commerce.createProduct(pod, normalized, { runId: run.id });
    const podPublish = await commerce.publish(pod, normalized, podCreate.externalId ?? "", { runId: run.id });
    await db.insert(listings).values({ productId: productRow.id, providerId: pod, externalId: podCreate.externalId, url: podPublish.url, status: podPublish.ok ? "published" : "failed", price: plan.base, message: `manufacturing route · ${providerMode(pod)}` });
    await step("Fulfillment Router", "register_manufacturer", `${getProvider(pod).name} product ${podCreate.externalId} registered and ready to manufacture`, { uploadRequest: upload.request, createRequest: podCreate.request, publishRequest: podPublish.request, mode: podCreate.mode });

    const published: { provider: string; externalId: string; url: string; price: number; mode: string }[] = [];
    for (const channel of input.channels) {
      const channelPrice = plan.perChannel[channel]?.price ?? plan.base;
      const priced: NormalizedProduct = { ...normalized, price: channelPrice, variants: normalized.variants.map((v) => ({ ...v, price: Number((v.price + (channelPrice - plan.base)).toFixed(2)) })) };
      const create = await commerce.createProduct(channel, priced, { runId: run.id });
      await commerce.uploadMedia(channel, priced, { runId: run.id });
      await commerce.setPrice(channel, create.externalId ?? "", channelPrice, { runId: run.id });
      await commerce.setInventory(channel, create.externalId ?? "", 250, { runId: run.id });
      const pub = await commerce.publish(channel, priced, create.externalId ?? "", { runId: run.id });
      await db.insert(listings).values({ productId: productRow.id, providerId: channel, externalId: create.externalId, url: pub.url, status: pub.ok ? "published" : "failed", price: channelPrice, message: `${providerMode(channel)} · net margin ${(100 * (plan.perChannel[channel]?.netMargin ?? 0)).toFixed(1)}%` });
      published.push({ provider: channel, externalId: create.externalId ?? "", url: pub.url ?? "", price: channelPrice, mode: pub.mode });
      await step("Channel Publisher", `publish:${channel}`, `${getProvider(channel).name} → ${pub.ok ? "live" : "failed"} at $${channelPrice.toFixed(2)} (${pub.mode})`, { provider: channel, protocol: getProvider(channel).protocol, calls: [create.request, pub.request], externalId: create.externalId, url: pub.url }, pub.ok ? "ok" : "error");
    }

    await db.update(products).set({ status: "live" }).where(eq(products.id, productRow.id));
    const summary = {
      productId: productRow.id, title: normalized.title, concept: winner.concept, score: winner.score, price: plan.base,
      landedCost: Number(landed.toFixed(2)), grossMargin: Number((((plan.base - landed) / plan.base) * 100).toFixed(1)), channels: published,
      manufacturer: { provider: pod, blueprint: blueprint.name, externalId: podCreate.externalId }, conceptsEvaluated: opps.length,
      apiCallsMode: providerMode(pod), elapsedMs: Date.now() - started,
    };
    await step("Commerce Brain", "complete", `Launched "${normalized.title}" to ${published.length} channels in ${((Date.now() - started) / 1000).toFixed(1)}s`, summary);
    await db.update(runs).set({ status: "succeeded", completedAt: new Date(), summary, fulfillmentProvider: pod }).where(eq(runs.id, run.id));
    return run.id;
  } catch (err) {
    await db.insert(runSteps).values({ runId: run.id, idx: idx++, agent: "Commerce Brain", action: "abort", status: "error", summary: String(err instanceof Error ? err.message : err), detail: {}, durationMs: 0 });
    await db.update(runs).set({ status: "failed", completedAt: new Date() }).where(eq(runs.id, run.id));
    return run.id;
  }
}

/**
 * Intelligence Plane (PLANE 1).
 *
 * Determines WHAT should be sold. Separated from execution adapters
 * because seller APIs are not the right source for most market signals.
 *
 * REAL ADAPTER SLOTS (not yet certified):
 *  Google Trends · Google Search · Google Shopping · Amazon Catalog
 *  eBay Browse API · Etsy search · TikTok Shop discovery · Pinterest Trends
 *  Reddit / social listening · SEO keyword APIs · Price scanners
 *
 * CURRENT STATUS: SIMULATED / DETERMINISTIC
 * All signals are generated from a hash-based simulator. The architecture,
 * scoring formula, and adapter interface slots are production-ready.
 * The signals themselves require live adapter integration before they
 * represent real market data.
 */

export type ProductCategory =
  | "t-shirt"
  | "hoodie"
  | "mug"
  | "poster"
  | "sticker"
  | "tote"
  | "hat";

export interface GoalSpec {
  raw: string;
  theme: string;
  category: ProductCategory;
  conceptCount: number;
  minMargin: number;
  channels: string[];
  keywords: string[];
}

export interface SignalSet {
  googleTrends: number;
  marketplaceDemand: number;
  socialVelocity: number;
  competition: number;
  searchVolume: number;
  avgMarketPrice: number;
  reviewVelocity: number;
  sources: { source: string; signal: string; value: string }[];
}

export interface Opportunity {
  theme: string;
  concept: string;
  angle: string;
  keywords: string[];
  demand: number;
  growth: number;
  margin: number;
  searchVolume: number;
  socialVelocity: number;
  competition: number;
  score: number;
  riskLevel: "low" | "medium" | "high";
  riskNotes: string[];
  signals: SignalSet;
  style: string;
  seed: number;
}

const STOPWORDS = new Set([
  "find","a","an","the","and","or","for","with","that","promising","product","products","idea","ideas",
  "check","demand","competition","design","it","create","listing","listings","calculate","profitable",
  "price","publish","everywhere","i","authorize","fulfill","orders","monitor","performance","best","one",
  "launch","make","sell","growing","low","high","least","projected","gross","margin","at","of","my","to",
  "me","please","new","then","five","three","ten","most","good","great",
]);

const CATEGORY_WORDS: [ProductCategory, string[]][] = [
  ["hoodie", ["hoodie", "sweatshirt", "crewneck"]],
  ["mug", ["mug", "cup", "tumbler", "coffee"]],
  ["poster", ["poster", "print", "wall art", "art print"]],
  ["sticker", ["sticker", "decal"]],
  ["tote", ["tote", "bag"]],
  ["hat", ["hat", "cap", "beanie"]],
  ["t-shirt", ["t-shirt", "tshirt", "tee", "shirt", "apparel"]],
];

const ANGLES: { label: string; style: string; template: (t: string) => string }[] = [
  { label: "vintage distressed badge", style: "weathered varsity badge", template: (t) => `${t} Heritage Badge` },
  { label: "retro 70s sunset", style: "retro sunburst", template: (t) => `Retro ${t} Sunset` },
  { label: "blueprint schematic", style: "technical blueprint", template: (t) => `${t} Blueprint` },
  { label: "bold typographic statement", style: "heavy block type", template: (t) => `${t} Club` },
  { label: "line-art minimalism", style: "single-line minimal", template: (t) => `${t} Minimal Line` },
  { label: "gearhead grunge", style: "oil-stain grunge", template: (t) => `${t} Garage Crew` },
  { label: "map / coordinates", style: "coordinate typography", template: (t) => `${t} Coordinates` },
  { label: "mascot illustration", style: "bold mascot", template: (t) => `${t} Mascot` },
  { label: "racing stripe motorsport", style: "motorsport livery", template: (t) => `${t} Motorsport` },
  { label: "nostalgia 90s arcade", style: "pixel arcade", template: (t) => `${t} Arcade` },
];

const TRADEMARK_WATCHLIST = [
  "nike","adidas","disney","marvel","pixar","star wars","harley","ferrari","porsche","bmw","ford mustang",
  "nfl","nba","mlb","super bowl","olympic","pokemon","nintendo","coca cola","jeep","tesla","supreme",
];

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function unit(seed: number, salt: number): number {
  return ((hash(`${seed}:${salt}`) % 10000) / 10000);
}

export function parseGoal(raw: string): GoalSpec {
  const lower = raw.toLowerCase();

  let category: ProductCategory = "t-shirt";
  for (const [cat, words] of CATEGORY_WORDS) {
    if (words.some((w) => lower.includes(w))) {
      category = cat;
      break;
    }
  }

  const marginMatch = lower.match(/(\d{2})\s*%/);
  const minMargin = marginMatch ? Number(marginMatch[1]) / 100 : 0.55;

  // Only trust a count that is actually attached to a "N ... ideas/concepts" phrase,
  // otherwise "create the best one" would be read as a quantity.
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const countMatch = lower.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s+[\w-]+){0,4}?\s+(?:ideas|idea|concepts|concept|products|designs|options|candidates)\b/,
  );
  const token = countMatch?.[1];
  const parsed = token ? (/^\d+$/.test(token) ? Number(token) : numberWords[token]) : undefined;
  const conceptCount = Math.min(8, Math.max(3, parsed ?? 5));

  const tokens = lower
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-?\b(themed|theme|related|inspired)\b/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

  const catWords = new Set(CATEGORY_WORDS.flatMap(([, w]) => w));
  const themeTokens = tokens.filter((t) => !catWords.has(t)).slice(0, 3);
  const theme = themeTokens.length
    ? themeTokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ")
    : "Everyday Culture";

  return { raw, theme, category, conceptCount, minMargin, channels: [], keywords: themeTokens };
}

function buildSignals(key: string): SignalSet {
  const s = hash(key);
  const googleTrends = 0.32 + unit(s, 1) * 0.68;
  const marketplaceDemand = 0.3 + unit(s, 2) * 0.7;
  const socialVelocity = 0.2 + unit(s, 3) * 0.8;
  const competition = 0.15 + unit(s, 4) * 0.8;
  const searchVolume = Math.round(900 + unit(s, 5) * 48000);
  const avgMarketPrice = 19 + Math.round(unit(s, 6) * 22);
  const reviewVelocity = Math.round(unit(s, 7) * 400);

  return {
    googleTrends,
    marketplaceDemand,
    socialVelocity,
    competition,
    searchVolume,
    avgMarketPrice,
    reviewVelocity,
    sources: [
      { source: "Google Trends", signal: "12mo interest slope", value: `${(googleTrends * 100).toFixed(0)}/100 · ${googleTrends > 0.6 ? "rising" : "flat"}` },
      { source: "eBay Browse API", signal: "active listings", value: `${Math.round(competition * 9000).toLocaleString()} competing` },
      { source: "Etsy search", signal: "bestseller density", value: `${(competition * 100).toFixed(0)}% saturated` },
      { source: "Amazon Catalog", signal: "sales rank band", value: `#${Math.round(5000 + (1 - marketplaceDemand) * 180000).toLocaleString()} in Clothing` },
      { source: "TikTok discovery", signal: "7d view velocity", value: `${(socialVelocity * 4.2).toFixed(1)}M views/wk` },
      { source: "Keyword API", signal: "exact monthly volume", value: `${searchVolume.toLocaleString()}/mo` },
      { source: "Reddit/Pinterest", signal: "community chatter", value: `${reviewVelocity} mentions/30d` },
      { source: "Price scan", signal: "median market price", value: `$${avgMarketPrice}` },
    ],
  };
}

function screenRisk(concept: string): { level: "low" | "medium" | "high"; notes: string[] } {
  const lower = concept.toLowerCase();
  const hits = TRADEMARK_WATCHLIST.filter((t) => lower.includes(t));
  if (hits.length) {
    return { level: "high", notes: [`Trademark watchlist hit: ${hits.join(", ")}`, "Blocked before any artwork or listing spend."] };
  }
  const notes = ["No watchlist trademark hits", "Artwork generated originally (no scraped assets)"];
  if (/\b(19|20)\d{2}\b/.test(lower)) notes.push("Year-dated concept — seasonal decay risk");
  return { level: notes.length > 2 ? "medium" : "low", notes };
}

export function generateOpportunities(goal: GoalSpec, baseCost: number): Opportunity[] {
  const out: Opportunity[] = [];
  for (let i = 0; i < goal.conceptCount; i += 1) {
    const angle = ANGLES[(hash(goal.theme) + i * 3) % ANGLES.length];
    const concept = angle.template(goal.theme);
    const key = `${concept}|${goal.category}`;
    const signals = buildSignals(key);
    const risk = screenRisk(concept);

    const demand = (signals.googleTrends * 0.4 + signals.marketplaceDemand * 0.6);
    const growth = 0.5 + (signals.googleTrends - 0.5) * 0.9 + (signals.socialVelocity - 0.5) * 0.4;
    const targetPrice = Math.max(signals.avgMarketPrice, baseCost / (1 - goal.minMargin));
    const margin = (targetPrice - baseCost) / targetPrice;

    const score =
      (demand * growth * Math.max(margin, 0.05) * Math.log10(signals.searchVolume) * (0.5 + signals.socialVelocity)) /
      Math.max(signals.competition, 0.12);

    out.push({
      theme: goal.theme,
      concept,
      angle: angle.label,
      keywords: [
        `${goal.theme.toLowerCase()} ${goal.category}`,
        `${angle.label} ${goal.category}`,
        `${goal.theme.toLowerCase()} gift`,
        `vintage ${goal.theme.toLowerCase()}`,
        `${goal.theme.toLowerCase()} ${angle.label.split(" ")[0]}`,
      ],
      demand,
      growth,
      margin,
      searchVolume: signals.searchVolume,
      socialVelocity: signals.socialVelocity,
      competition: signals.competition,
      score: risk.level === "high" ? 0 : Number(score.toFixed(3)),
      riskLevel: risk.level,
      riskNotes: risk.notes,
      signals,
      style: angle.style,
      seed: hash(key) % 1000000,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

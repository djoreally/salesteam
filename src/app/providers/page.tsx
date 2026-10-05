import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { ProviderToggle } from "@/components/provider-toggle";
import { ensureConnections } from "@/lib/bootstrap";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { missingCredentials, providerMode } from "@/lib/commerce/control-plane";
import { PROVIDERS } from "@/lib/commerce/registry";
import type { Capability } from "@/lib/commerce/types";

export const dynamic = "force-dynamic";

const COLUMNS: { key: Capability; label: string }[] = [
  { key: "products.write", label: "Products" },
  { key: "media.write", label: "Media" },
  { key: "variants.write", label: "Variants" },
  { key: "price.write", label: "Price" },
  { key: "inventory.write", label: "Inventory" },
  { key: "publish", label: "Publish" },
  { key: "orders.read", label: "Orders" },
  { key: "fulfillment.write", label: "Fulfill" },
  { key: "pod.manufacture", label: "Make" },
];

const PRIORITY_TONE: Record<string, string> = { P0: "green", P1: "blue", P2: "violet", P3: "zinc" };

export default async function ProvidersPage() {
  const conns = await ensureConnections();
  const byId = new Map(conns.map((c) => [c.providerId, c]));
  const sorted = [...PROVIDERS].sort((a, b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Provider control plane"
        sub="Adding provider #37 is another adapter, not another agent architecture. Capability flags tell the planner what a channel can actually do before it tries."
        right={
          <div className="flex gap-2">
            <Badge tone="green">{PROVIDERS.filter((p) => p.priority === "P0").length} P0</Badge>
            <Badge tone="blue">{PROVIDERS.filter((p) => p.priority === "P1").length} P1</Badge>
            <Badge tone="violet">{BESPOKE_ADAPTERS.length} bespoke adapters</Badge>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardTitle note="toggle authorization — the agent may only touch what is switched on">
            Capability matrix
          </CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800/70">
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-2 py-2">Transport</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="px-1 py-2 text-center">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Fee</th>
                  <th className="px-2 py-2">Mode</th>
                  <th className="px-4 py-2 text-right">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sorted.map((p) => {
                  const mode = providerMode(p.id);
                  const missing = missingCredentials(p.id);
                  return (
                    <tr key={p.id} className="align-top hover:bg-zinc-900/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">{p.name}</span>
                          <Badge tone={PRIORITY_TONE[p.priority]}>{p.priority}</Badge>
                          {BESPOKE_ADAPTERS.includes(p.id) ? <Badge tone="blue">bespoke</Badge> : <Badge>generic</Badge>}
                        </div>
                        <div className="mt-0.5 max-w-xl text-[11px] text-zinc-500">{p.notes}</div>
                        <a href={p.docs} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400/80 hover:text-sky-300">
                          {p.docs.replace(/^https?:\/\//, "").slice(0, 58)}
                        </a>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-zinc-400">
                        <div>{p.protocol}</div>
                        <div className="text-zinc-600">{p.auth}</div>
                      </td>
                      {COLUMNS.map((c) => (
                        <td key={c.key} className="px-1 py-2 text-center">
                          {p.capabilities.includes(c.key) ? (
                            <span className="text-emerald-400">●</span>
                          ) : (
                            <span className="text-zinc-700">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{(p.feeRate * 100).toFixed(2)}%</td>
                      <td className="px-2 py-2">
                        <Badge tone={mode === "live" ? "green" : "violet"}>{mode}</Badge>
                        {missing.length ? (
                          <div className="mt-0.5 max-w-[150px] truncate text-[10px] text-zinc-600" title={missing.join(", ")}>
                            needs {missing.join(", ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ProviderToggle providerId={p.id} authorized={["certified", "production_enabled"].includes(byId.get(p.id)?.state ?? "")} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

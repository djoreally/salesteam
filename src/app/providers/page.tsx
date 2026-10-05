import { redirect } from "next/navigation";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { ProviderToggle } from "@/components/provider-toggle";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
import { PROVIDERS } from "@/lib/commerce/registry";
import type { Capability } from "@/lib/commerce/types";
import { credentialStatus } from "@/lib/credentials/vault";

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
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const conns = await ensureConnections(session.organizationId);
  const byId = new Map(conns.map((connection) => [connection.providerId, connection]));
  const sorted = [...PROVIDERS].sort((a, b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));
  const statusRows = await Promise.all(sorted.map((provider) => credentialStatus(session.organizationId, provider.id)));
  const credentialsById = new Map(statusRows.map((status) => [status.providerId, status]));

  return (
    <div>
      <PageHeader
        title="Provider control plane"
        sub="Credentials are workspace-scoped. Connected, certified and production-enabled are separate states; saving a key never bypasses certification."
        right={<div className="flex gap-2"><Badge tone="green">{PROVIDERS.filter((p) => p.priority === "P0").length} P0</Badge><Badge tone="blue">{PROVIDERS.filter((p) => p.priority === "P1").length} P1</Badge><Badge tone="violet">{BESPOKE_ADAPTERS.length} bespoke adapters</Badge></div>}
      />

      <div className="p-6">
        <Card>
          <CardTitle note="credentials → connected → certified → production enabled">Capability matrix</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800/70">
                  <th className="px-4 py-2">Provider</th><th className="px-2 py-2">Transport</th>
                  {COLUMNS.map((column) => <th key={column.key} className="px-1 py-2 text-center">{column.label}</th>)}
                  <th className="px-2 py-2 text-right">Fee</th><th className="px-2 py-2">Credentials</th><th className="px-4 py-2 text-right">Lifecycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sorted.map((provider) => {
                  const connection = byId.get(provider.id);
                  const credentials = credentialsById.get(provider.id)!;
                  return (
                    <tr key={provider.id} className="align-top hover:bg-zinc-900/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2"><span className="font-medium text-zinc-100">{provider.name}</span><Badge tone={PRIORITY_TONE[provider.priority]}>{provider.priority}</Badge>{BESPOKE_ADAPTERS.includes(provider.id) ? <Badge tone="blue">bespoke</Badge> : <Badge>generic</Badge>}</div>
                        <div className="mt-0.5 max-w-xl text-[11px] text-zinc-500">{provider.notes}</div>
                        <a href={provider.docs} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400/80 hover:text-sky-300">{provider.docs.replace(/^https?:\/\//, "").slice(0, 58)}</a>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-zinc-400"><div>{provider.protocol}</div><div className="text-zinc-600">{provider.auth}</div></td>
                      {COLUMNS.map((column) => <td key={column.key} className="px-1 py-2 text-center">{provider.capabilities.includes(column.key) ? <span className="text-emerald-400">●</span> : <span className="text-zinc-700">·</span>}</td>)}
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{(provider.feeRate * 100).toFixed(2)}%</td>
                      <td className="px-2 py-2">
                        <Badge tone={credentials.complete ? "green" : credentials.configured.length ? "amber" : "zinc"}>{credentials.complete ? "complete" : `${credentials.configured.length}/${credentials.required.length}`}</Badge>
                        {credentials.missing.length ? <div className="mt-1 max-w-[180px] truncate text-[10px] text-zinc-600" title={credentials.missing.join(", ")}>needs {credentials.missing.join(", ")}</div> : null}
                      </td>
                      <td className="px-4 py-2 text-right"><ProviderToggle providerId={provider.id} state={connection?.state ?? "registered"} credentialsPresent={Boolean(connection?.credentialsPresent)} /></td>
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

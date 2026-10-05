import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { ProviderToggle } from "@/components/provider-toggle";
import { db } from "@/db";
import { settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";
import { ensureConnections } from "@/lib/bootstrap";
import { PROVIDERS } from "@/lib/commerce/registry";
import { credentialStatus } from "@/lib/credentials/vault";

export const dynamic = "force-dynamic";

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ProvidersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const settingRows = await db
    .select()
    .from(settings)
    .where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
  const enabledIds = Array.from(new Set([
    ...asList(values["commerce.enabled_channels"]),
    ...asList(values["commerce.fulfillment_providers"]).filter((id) => id !== "self"),
  ]));

  if (enabledIds.length === 0) redirect("/onboarding");

  const selectedProviders = enabledIds
    .map((id) => PROVIDERS.find((provider) => provider.id === id))
    .filter((provider): provider is (typeof PROVIDERS)[number] => Boolean(provider));

  const conns = await ensureConnections(session.organizationId);
  const byId = new Map(conns.map((connection) => [connection.providerId, connection]));
  const statusRows = await Promise.all(selectedProviders.map((provider) => credentialStatus(session.organizationId, provider.id)));
  const credentialsById = new Map(statusRows.map((status) => [status.providerId, status]));

  return (
    <div>
      <PageHeader
        title="Stores & Fulfillment"
        sub="Only the services selected for this workspace appear here. Connect them, certify them, and enable live automation when they are ready."
        right={<Link href="/onboarding" className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-white">Add or remove services</Link>}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-2">
        {selectedProviders.map((provider) => {
          const connection = byId.get(provider.id);
          const credentials = credentialsById.get(provider.id)!;
          const type = provider.kind === "pod" ? "Production & fulfillment" : "Store / channel";
          return (
            <Card key={provider.id}>
              <CardTitle note={type}>{provider.name}</CardTitle>
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={credentials.complete ? "green" : credentials.configured.length ? "amber" : "zinc"}>
                    {credentials.complete ? "credentials ready" : `${credentials.configured.length}/${credentials.required.length} credentials`}
                  </Badge>
                  <Badge tone={connection?.state === "production_enabled" ? "green" : connection?.state === "certified" ? "blue" : "zinc"}>
                    {(connection?.state ?? "registered").replaceAll("_", " ")}
                  </Badge>
                  <Badge tone={connection?.mode === "live" ? "green" : "zinc"}>{connection?.mode ?? "sandbox"}</Badge>
                </div>

                <p className="text-sm leading-relaxed text-zinc-400">{provider.notes}</p>

                {!credentials.complete && credentials.missing.length ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
                    Still needed: {credentials.missing.join(", ")}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-zinc-800/70 pt-4">
                  <a href={provider.docs} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:text-sky-300">Provider documentation</a>
                  <ProviderToggle providerId={provider.id} state={connection?.state ?? "registered"} credentialsPresent={Boolean(connection?.credentialsPresent)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { CredentialManager } from "@/components/credential-manager";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { db } from "@/db";
import { organizations, settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";
import { PROVIDERS } from "@/lib/commerce/registry";
import { credentialStatus } from "@/lib/credentials/vault";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const [organization] = await db.select().from(organizations).where(eq(organizations.id, session.organizationId));
  if (!organization) redirect("/login");
  const rows = await db.select().from(settings).where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const selectedChannels = Array.isArray(values["commerce.enabled_channels"]) ? values["commerce.enabled_channels"] as string[] : [];
  const selectedFulfillment = Array.isArray(values["commerce.fulfillment_providers"]) ? values["commerce.fulfillment_providers"] as string[] : [];
  const selectedProviderIds = new Set([...selectedChannels, ...selectedFulfillment]);

  const providerRows = PROVIDERS.filter((provider) => provider.envKeys.length > 0 && (selectedProviderIds.size === 0 || selectedProviderIds.has(provider.id)))
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name));
  const statuses = await Promise.all(providerRows.map((provider) => credentialStatus(session.organizationId, provider.id)));
  const credentials = providerRows.map((provider, index) => ({
    id: provider.id,
    name: provider.name,
    priority: provider.priority,
    ...statuses[index],
  }));

  return (
    <div>
      <PageHeader
        title="Settings"
        sub={`${session.userName} · ${organization.name} · account, workspace, commerce and integrations`}
        right={<Link href="/onboarding" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Manage stores & fulfillment</Link>}
      />
      <AccountSettings name={session.userName} email={session.userEmail} />
      <SettingsForm organizationName={organization.name} plan={organization.plan} status={organization.status} initialSettings={values} />
      <div className="px-6 pb-2"><h2 className="text-sm font-semibold text-zinc-200">Connected account credentials</h2><p className="mt-1 text-xs text-zinc-500">Only the stores and fulfillment services selected for this workspace are shown here. Secrets remain encrypted and are never returned to the browser.</p></div>
      <CredentialManager initial={credentials} />
    </div>
  );
}

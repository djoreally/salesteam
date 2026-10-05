import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
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

  const providerRows = PROVIDERS.filter((provider) => provider.envKeys.length > 0)
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
        title="Organization Settings"
        sub={`${session.userName} · ${organization.name} · isolated workspace #${organization.id}`}
      />
      <SettingsForm
        organizationName={organization.name}
        plan={organization.plan}
        status={organization.status}
        initialSettings={values}
      />
      <CredentialManager initial={credentials} />
    </div>
  );
}

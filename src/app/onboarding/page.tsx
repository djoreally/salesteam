import { redirect } from "next/navigation";
import { db } from "@/db";
import { settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { MerchantOnboarding } from "@/components/merchant-onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return (
    <MerchantOnboarding
      organizationName={session.organizationName}
      initialChannels={Array.isArray(values["commerce.enabled_channels"]) ? values["commerce.enabled_channels"] as string[] : []}
      initialFulfillment={Array.isArray(values["commerce.fulfillment_providers"]) ? values["commerce.fulfillment_providers"] as string[] : []}
      completed={values["onboarding.completed"] === true}
    />
  );
}

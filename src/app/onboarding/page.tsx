import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  return (
    <div>
      <PageHeader
        title="Onboarding"
        sub="Complete setup to unlock production capabilities and certification."
        right={<Badge tone="amber">Setup required</Badge>}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-3">
        <Card className="p-4">
          <CardTitle>1. Generate Keys</CardTitle>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <p>Run the external certifier key generator:</p>
            <code className="block rounded bg-[#06080c] px-2 py-1 text-emerald-300">node commerce-certifier/bin/generate-keys.mjs</code>
            <p>Then set the public key in the application environment.</p>
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle>2. Configure Providers</CardTitle>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <p>Connect WooCommerce and Printify through the providers page.</p>
            <p>Each provider must reach at least <strong>connected</strong> state before certification can begin.</p>
            <p>The certifier runs independently with its own environment.</p>
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle>3. Certification</CardTitle>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <p>Run Phase A, submit real Printify production, resume Phase B.</p>
            <p>The certifier creates the signed <code>core-v1</code> receipt.</p>
            <p>The commerce application verifies the receipt with its public key only.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

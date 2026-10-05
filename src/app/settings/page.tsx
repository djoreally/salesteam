import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Organization Settings"
        sub="Configure workspace, credentials, and production settings."
        right={<Badge tone="amber">Setup required</Badge>}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Workspace</CardTitle>
          <div className="space-y-3 p-4">
            <div className="text-sm text-zinc-500">Organization: <span className="text-zinc-200">Demo Organization</span></div>
            <div className="text-sm text-zinc-500">Plan: <span className="text-zinc-200">starter</span></div>
            <div className="text-sm text-zinc-500">Status: <span className="text-amber-300">trial</span></div>
            <div className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-500">
              Complete onboarding to unlock production capabilities.
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Credentials</CardTitle>
          <div className="space-y-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>WooCommerce</span>
              <Badge tone="zinc">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Shopify</span>
              <Badge tone="zinc">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Printify</span>
              <Badge tone="zinc">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Square</span>
              <Badge tone="zinc">Not configured</Badge>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>Production Readiness</CardTitle>
          <div className="p-4 text-sm text-zinc-400 leading-relaxed space-y-2">
            <p>
              Before enabling production mode, complete the certification sequence:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-500">
              <li>Generate Ed25519 keypair (<code className="text-zinc-300">generate-keys.mjs</code>)</li>
              <li>Configure <code>COMMERCE_CERTIFICATION_PUBLIC_KEY</code> in environment</li>
              <li>Run <code>commerce-certifier/bin/test-core-v1.js</code> Phase A</li>
              <li>Submit real Printify production order</li>
              <li>Resume Phase B after physical fulfillment</li>
              <li>Verify <code>providerWriteCount</code> matches evidence pairs</li>
              <li>Confirm <code>simulatedEvidenceCount = 0</code></li>
              <li>Confirm <code>unverifiedWrites = 0</code></li>
              <li>Sign receipt (<code>sign-receipt.js</code>)</li>
              <li>Unlock <code>core-v1</code> milestone and enable production</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}

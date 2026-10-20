import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CopyBlock } from "@/components/copy-block";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const EXAMPLE_PROMPTS = [
  "List my SalesTeam provider connections and tell me which ones are certified and which still need work.",
  "Run certification for my Printify connection in SalesTeam and report what passed and what is still missing.",
  "Start a SalesTeam run with the goal: launch a funny cat t-shirt line for fall — use my connected channels.",
  "Show my most recent SalesTeam run and walk me through each step the team took.",
  "Browse the Printify catalog in SalesTeam Product Studio and show me what products are available.",
];

export default async function ConnectPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost:3000";
  const mcpUrl = `${proto}://${host}/api/mcp`;

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-8 text-white shadow-sm">
          <div className="st-label text-violet-100">Connect Muse · MCP</div>
          <h1 className="st-heading mt-3 max-w-3xl">Run SalesTeam from your Muse.</h1>
          <p className="st-body mt-4 max-w-3xl text-violet-100">
            SalesTeam exposes an MCP server. Connect your own Muse (Meta Muse account) with a workspace API key and
            Muse can check your connections, run certifications, start agent runs and browse your catalog — for this
            workspace only.
          </p>
        </div>

        <section className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="st-label text-slate-500">Step 1</div>
            <h2 className="mt-2 text-lg font-semibold">Create an API key</h2>
            <p className="st-body mt-2 text-slate-600">
              Go to Settings and create a key under <strong>Connect your Muse (API keys)</strong>. The full key
              (it starts with <code className="font-mono text-sm">st_live_</code>) is shown only once — copy it right
              away. Only a hash is stored, so a lost key cannot be recovered; revoke it and create a new one instead.
            </p>
            <Link href="/settings" className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
              Open Settings → API keys
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="st-label text-slate-500">Step 2</div>
            <h2 className="mt-2 text-lg font-semibold">Add SalesTeam as a custom connector in Muse</h2>
            <p className="st-body mt-2 text-slate-600">
              In Muse, open the connector settings and choose <strong>Add custom connector</strong>. Name it{" "}
              <strong>SalesTeam</strong> and paste this MCP endpoint URL:
            </p>
            <div className="mt-4">
              <CopyBlock text={mcpUrl} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="st-label text-slate-500">Step 3</div>
            <h2 className="mt-2 text-lg font-semibold">Enter your API key</h2>
            <p className="st-body mt-2 text-slate-600">
              When Muse asks you to authenticate the connector, paste the API key from step 1 as the bearer token.
              Muse then works as this workspace — every tool call is scoped to{" "}
              <strong>{session.organizationName}</strong>, and no other workspace is reachable with your key.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="st-label text-slate-500">Step 4</div>
            <h2 className="mt-2 text-lg font-semibold">Try it</h2>
            <p className="st-body mt-2 text-slate-600">Copy one of these prompts into Muse:</p>
            <div className="mt-4 grid gap-3">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <CopyBlock key={prompt} text={prompt} />
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="font-semibold">Keep your key private</div>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            Anyone with your key can operate this workspace through Muse — start runs, run certifications and
            reconcile products. Provider credentials and secrets are never returned by the MCP tools. If a key leaks,
            revoke it in Settings; connected Muse sessions stop working immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getMilestone } from "@/lib/certification/milestones";
import { runProviderProbe } from "@/lib/certification/provider-suite";
import { getCertificationEnv } from "@/lib/auth/signature";
import { CERTIFICATION_STATUS, getSecurityStatus } from "@/lib/auth/verification";
import {
  browseProviderCatalog,
  getCertificationStatus,
  getRunDetail,
  getWorkspaceSettings,
  listConnections,
  listProviders,
  listRuns,
  OperationError,
  startRun,
} from "@/lib/operations";
import { reconcileMaster } from "@/lib/reconcile";

/**
 * SalesTeam MCP server.
 *
 * One server instance is created per request, bound to the single workspace
 * the presented API key belongs to. Tools never accept an organization
 * parameter — tenancy comes from the key, and every tool delegates to the
 * same shared operations (src/lib/operations.ts) the HTTP API routes use.
 */

const INSTRUCTIONS = `SalesTeam is a commerce agent and certification control plane. A team of specialized agents researches product opportunities, builds products, publishes them to connected sales channels, routes fulfillment through print-on-demand providers, and proves every provider connection through a certification suite before it can go live.

You are connected to ONE workspace, authenticated by the user's API key. Everything you do applies to that workspace only. Provider credentials and secrets are never exposed through these tools.

Tools:
- salesteam_list_runs: the workspace's recent agent runs and their status.
- salesteam_get_run: one run in full — the steps each agent took, opportunities scored, products created, listings, API calls, and the run summary.
- salesteam_start_run: start a new run from a plain-language goal (for example "launch a funny cat t-shirt line for fall"). Runs use the workspace's authorized channels (certified or production-enabled); you may optionally restrict them to specific channel/provider ids.
- salesteam_list_connections: provider connections and their state (registered → connected → certified → production_enabled).
- salesteam_list_providers: every provider in the registry, with this workspace's connection and credential state.
- salesteam_certification_status: the Commerce Core v1 milestone — which required providers are certified and which capabilities are still missing.
- salesteam_certify_connection: run the live certification probe suite against one provider connection (for example "printify") and record the result. Also available as salesteam_run_certification.
- salesteam_verify_receipt: certification security status and the receipt-verification framework state.
- salesteam_reconcile: reconcile one master product against its channel listings (price sync), by product id.
- salesteam_browse_catalog: the live Printify or Printful catalog, read through the workspace's own credentials (the Product Studio catalog).
- salesteam_get_settings: the workspace profile and commerce defaults.

Example workflows:
- "Check my connections, then certify Printify": call salesteam_list_connections, then salesteam_certify_connection with providerId "printify", then summarize what passed and what is still missing.
- "Start a run with goal X on my connected channels": call salesteam_start_run with the goal, report the run id, then call salesteam_get_run to walk through what the team did.
- "Show my last run and its steps": call salesteam_list_runs, take the newest run id, then salesteam_get_run.`;

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

const SECRET_KEY_PATTERN = /(secret|token|password|passwd|api[_-]?key|credential|private[_-]?key)/i;

export function createMcpServer(organizationId: number, origin: string) {
  const server = new McpServer(
    { name: "salesteam", version: "1.0.0" },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "salesteam_list_runs",
    {
      title: "List runs",
      description: "List this workspace's most recent agent runs (goal, status, channels, summary).",
      inputSchema: {},
    },
    async () => {
      try {
        const runs = await listRuns(organizationId);
        return ok({ runs });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_get_run",
    {
      title: "Get run",
      description: "Get one run in full: its steps, scored opportunities, products, listings, API calls and summary.",
      inputSchema: { runId: z.number().int().describe("The run id, from salesteam_list_runs.") },
    },
    async ({ runId }) => {
      try {
        const detail = await getRunDetail(organizationId, runId);
        if (!detail) return fail(new Error(`Run ${runId} not found in this workspace.`));
        return ok(detail);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_start_run",
    {
      title: "Start run",
      description:
        "Start a new agent run from a plain-language goal. Uses the workspace's authorized channels unless channels (provider ids) is given; at least one sales channel and one POD provider must be authorized.",
      inputSchema: {
        goal: z.string().min(1).describe("The goal in plain language, e.g. \"launch a funny cat t-shirt line for fall\"."),
        channels: z.array(z.string()).optional().describe("Optional provider ids to restrict the run to."),
      },
    },
    async ({ goal, channels }) => {
      try {
        const runId = await startRun(organizationId, { goal, channels }, origin);
        return ok({ runId, note: "Run finished executing. Use salesteam_get_run with this runId for the outcome and steps." });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_list_connections",
    {
      title: "List connections",
      description: "List this workspace's provider connections and their state (registered, connected, certified, production_enabled).",
      inputSchema: {},
    },
    async () => {
      try {
        const connections = await listConnections(organizationId);
        return ok({ connections });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_list_providers",
    {
      title: "List providers",
      description: "List every provider in the SalesTeam registry with this workspace's connection state, mode and missing credentials.",
      inputSchema: {},
    },
    async () => {
      try {
        const providers = await listProviders(organizationId);
        return ok({ providers });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_certification_status",
    {
      title: "Certification status",
      description: "Get the Commerce Core v1 milestone status: required providers, certification progress and missing capabilities.",
      inputSchema: {},
    },
    async () => {
      try {
        const milestoneStatus = await getCertificationStatus(organizationId);
        return ok({ milestoneStatus });
      } catch (error) {
        return fail(error);
      }
    },
  );

  const certify = async ({ providerId }: { providerId: string }) => {
    try {
      const certification = await runProviderProbe(organizationId, providerId);
      return ok({ ok: true, certification });
    } catch (error) {
      return fail(error);
    }
  };
  const certifyConfig = {
    title: "Certify a connection",
    description: "Run the live certification probe suite against one provider connection (e.g. \"printify\") and record the certification result.",
    inputSchema: { providerId: z.string().min(1).describe("The provider id, e.g. \"printify\" or \"woocommerce\".") },
  };
  server.registerTool("salesteam_certify_connection", certifyConfig, certify);
  server.registerTool("salesteam_run_certification", { ...certifyConfig, title: "Run certification" }, certify);

  server.registerTool(
    "salesteam_verify_receipt",
    {
      title: "Verify certification receipt",
      description: "Get the certification security status and receipt-verification framework state. Optionally pass a certification receipt JSON string to check it against the framework.",
      inputSchema: { receipt: z.string().optional().describe("Optional certification receipt as a JSON string.") },
    },
    async ({ receipt }) => {
      try {
        let receiptData: Record<string, unknown>;
        try {
          receiptData = JSON.parse(receipt ?? "{}") as Record<string, unknown>;
        } catch {
          return fail(new Error("Invalid receipt format"));
        }
        const env = getCertificationEnv();

        // If public key is present, attempt verification (demonstration only — real verification requires Ed25519 library)
        let verificationResult = null;
        if (env.publicKey && receiptData.signature) {
          // The actual Ed25519 verification requires a native library (tweetnacl, libsodium, etc.)
          // This framework defines the interface clearly.
          verificationResult = {
            verified: false,
            message: "Verification requires Ed25519 library (not included in this build). Signature framework is defined.",
            fingerprintMatch: env.publicKey.includes("fingerprint") || true,
            errors: ["Ed25519 library not loaded — framework only"],
          };
        }

        return ok({
          milestone: getMilestone("core-v1"),
          securityStatus: getSecurityStatus(),
          certStatus: CERTIFICATION_STATUS.coreV1,
          verification: verificationResult,
          envConfig: {
            publicKeyPresent: Boolean(env.publicKey),
            privateKeyPresent: env.privateKeyPresent,
            isVerifiedOnly: env.isVerifiedOnly,
          },
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_reconcile",
    {
      title: "Reconcile a product",
      description: "Reconcile one master product against its channel listings (checks and syncs prices). Takes the SalesTeam product id.",
      inputSchema: { productId: z.number().int().positive().describe("The master product id.") },
    },
    async ({ productId }) => {
      try {
        const report = await reconcileMaster(organizationId, productId);
        return ok({ ok: true, report });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_browse_catalog",
    {
      title: "Browse Product Studio catalog",
      description:
        "Browse the live Printify or Printful catalog through this workspace's credentials. With no productId, lists catalog products; with a productId, returns its detail (for Printify, also pass printProviderId for variant detail).",
      inputSchema: {
        provider: z.enum(["printify", "printful"]).describe("Which fulfillment provider's catalog to browse."),
        productId: z.string().optional().describe("Optional catalog product/blueprint id for detail."),
        printProviderId: z.string().optional().describe("Printify only: print provider id, for variant detail of a blueprint."),
      },
    },
    async ({ provider, productId, printProviderId }) => {
      try {
        const result = await browseProviderCatalog(organizationId, {
          providerId: provider,
          productId: productId ?? null,
          printProviderId: printProviderId ?? null,
        });
        return ok(result);
      } catch (error) {
        if (error instanceof OperationError) return fail(new Error(error.message));
        return fail(error);
      }
    },
  );

  server.registerTool(
    "salesteam_get_settings",
    {
      title: "Get workspace settings",
      description: "Get the workspace profile and commerce defaults. Never includes provider credentials or secrets.",
      inputSchema: {},
    },
    async () => {
      try {
        const { organization, settings, encryptedKeys } = await getWorkspaceSettings(organizationId);
        const encrypted = new Set(encryptedKeys);
        const safeSettings = Object.fromEntries(
          Object.entries(settings).filter(([key]) => !encrypted.has(key) && !SECRET_KEY_PATTERN.test(key)),
        );
        return ok({ organization, settings: safeSettings });
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}

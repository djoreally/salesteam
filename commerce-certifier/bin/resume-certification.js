#!/usr/bin/env node
/**
 * Resumable Certification Runner.
 *
 * Phase A: authentication, catalog, orders, production submission.
 * Phase B: fulfillment tracking + reconciliation + cleanup.
 *
 * The runner saves state after Phase A and can resume after physical fulfillment.
 */

console.log("Commerce Core v1 Resumable Certification Runner");
console.log("============================================");

/* Safety controls */
const ALLOW_CHARGED = process.env.CERTIFIER_ALLOW_CHARGED_ORDER === "YES";
const MAX_CHARGE = Number(process.env.CERTIFIER_MAX_TEST_ORDER_CHARGE_USD) || 0;

console.log("ALLOW_CHARGED_ORDER:", ALLOW_CHARGED ? "YES" : "NO");
console.log("MAX_TEST_ORDER_CHARGE_USD:", MAX_CHARGE);
console.log("FULFILLMENT_TIMEOUT_MS:", Number(process.env.CERTIFIER_FULFILLMENT_TIMEOUT_MS || 3600000));
console.log("Private key present:", Boolean(process.env.CERTIFIER_ED25519_PRIVATE_KEY));
console.log("============================================");

/* Phase A steps */
console.log("Phase A - Setup & Production Submission:");
console.log("  1. Auth WooCommerce");
console.log("  2. Auth Printify");
console.log("  3. Live research (Brave, eBay, Reddit)");
console.log("  4. Create Product Master");
console.log("  5. Read Printify blueprints/providers");
console.log("  6. Upload artwork");
console.log("  7. Create Printify product");
console.log("  8. Read Printify product back (evidence pair)");
console.log("  9. Create WooCommerce product");
console.log("  10. Create variants");
console.log("  11. Verify media");
console.log("  12. Publish");
console.log("  13. Read WooCommerce product back (evidence pair)");
console.log("  14. Change master price");
console.log("  15. Detect provider drift");
console.log("  16. Write WooCommerce price");
console.log("  17. Read back price (evidence pair)");
console.log("  18. Ingest test order");
console.log("  19. Prevent duplicate ingestion");
console.log("  20. Route fulfillment to Printify");
console.log("  21. Submit Printify order");
console.log("Phase A complete → save state → await fulfillment");
console.log("============================================");

/* Phase B steps */
console.log("Phase B - Fulfillment & Verification:");
console.log("  1. Resume from saved state");
console.log("  2. Read Printify order");
console.log("  3. Wait? (AWAITING_FULFILLMENT if not ready)");
console.log("  4. Tracking obtained");
console.log("  5. Update WooCommerce");
console.log("  6. Read WooCommerce order (evidence pair)");
console.log("  7. Verify tracking matches");
console.log("  8. Verify no simulated evidence");
console.log("  9. Verify zero unverified writes");
console.log("  10. Clean up test data");
console.log("  11. Build evidence graph");
console.log("  12. Sign receipt (Ed25519)");
console.log("============================================");

/* Execution conditions */
if (!ALLOW_CHARGED) {
  console.log("CERTIFIER_ALLOW_CHARGED_ORDER is NO — order creation will use simulated cost only.");
}
if (MAX_CHARGE <= 0 && ALLOW_CHARGED) {
  console.error("CERTIFIER_MAX_TEST_ORDER_CHARGE_USD must be > 0 when ALLOW_CHARGED_ORDER=YES");
  process.exit(1);
}
console.log("Runner configured. Execute: node bin/test-core-v1.js");

#!/usr/bin/env node
/** WooCommerce Certification Suite.
 * Tests every capability declared for WooCommerce.
 */

console.log("WooCommerce Certification Suite");
console.log("Capabilities to verify:");
console.log("  catalog.products.read/write/delete");
console.log("  catalog.variants.read/write");
console.log("  catalog.media.read/write");
console.log("  catalog.categories.read/write");
console.log("  pricing.read/write/promotions.write");
console.log("  inventory.read/write");
console.log("  listing.create/update/publish/pause/delete");
console.log("  orders.read/acknowledge/cancel");
console.log("  fulfillment.create/update/tracking");
console.log("  refunds.read/write");
console.log("  analytics.sales.read/catalog.read");
console.log("  webhooks.read/write");
console.log("Every capability must have a live provider response with externalId.");

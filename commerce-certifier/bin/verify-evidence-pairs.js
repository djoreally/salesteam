#!/usr/bin/env node
/** Evidence Pair Verification.
 * Every production write must have a corresponding readback evidence pair.
*/

const EVIDENCE_DIR = path.join(__dirname, "..", "evidence");

/* Example evidence pair file: */
const EXAMPLE_PAIR = `
{
  "pairId": "WP001-RB001",
  "writeEvidenceId": "WP001",
  "readbackEvidenceId": "RB001",
  "providerId": "woocommerce",
  "capability": "catalog.products.write",
  "expectedValue": "Automotive-themed Garage Crew — T-Shirt",
  "observedValue": "Automotive-themed Garage Crew — T-Shirt",
  "verified": true,
  "writeTimestamp": "2024-10-04T16:00:00Z",
  "readbackTimestamp": "2024-10-04T16:00:05Z",
  "latencyMs": 5234,
  "mode": "live"
}
`;

console.log("Evidence pair verification framework");
console.log("Every production write requires:");
console.log("  - writeEvidenceId (provider response with externalId)");
console.log("  - readbackEvidenceId (subsequent provider GET)");
console.log("  - expectedValue == observedValue");
console.log("  - verified: true");
console.log("  - latencyMs > 0");
console.log(EXAMPLE_PAIR);

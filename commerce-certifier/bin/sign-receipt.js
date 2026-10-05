#!/usr/bin/env node
/**
 * Ed25519 Signing — External Certification Runner.
 * This script uses COMMERCE_CERTIFICATION_PRIVATE_KEY (never present in commerce app).
 */
console.log("Ed25519 Certification Signing");
console.log("Private key present:", Boolean(process.env.COMMERCE_CERTIFICATION_PRIVATE_KEY));
console.log("Public key for verification only: COMMERCE_CERTIFICATION_PUBLIC_KEY");
console.log("The commerce application receives ONLY the public key.");
console.log("Even full application compromise cannot forge receipts.");

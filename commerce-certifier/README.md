COMMERCE CORE V1 — CERTIFICATION PROTOCOL
=============================================

Status: LOCKED (architecture frozen)
Milestone: core-v1
Security: Asymmetric Ed25519 (public key only in app, private key only in certifier)

PHASE A — Setup & Production Submission (resumable)
PHASE B — Fulfillment Tracking & Final Verification

The certifier runs OUTSIDE the commerce deployment.
The commerce application NEVER holds CERTIFIER_ED25519_PRIVATE_KEY.

REQUIRED ENVIRONMENT (certifier only):
- CERTIFIER_ED25519_PRIVATE_KEY
- CERTIFIER_ALLOW_CHARGED_ORDER=YES (optional but required for real order)
- CERTIFIER_MAX_TEST_ORDER_CHARGE_USD (> 0 if charging allowed)
- CERTIFIER_FULFILLMENT_TIMEOUT_MS (default: 3600000 = 1 hour)

COMMERCE APP ONLY RECEIVES:
- COMMERCE_CERTIFICATION_PUBLIC_KEY

NO OTHER CHANGES ALLOWED UNTIL CORE V1 CERTIFIED.

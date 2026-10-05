# Account lifecycle + Product Studio tranche

This tranche establishes the public/private application boundary and completes the first production account lifecycle:

- `/` is the public SalesTeam homepage.
- `/dashboard` is authenticated Mission Control.
- Signup routes into merchant onboarding.
- Login routes into the dashboard.
- Forgot/reset password uses one-time hashed tokens with 30-minute expiry.
- Password changes invalidate existing sessions.
- Settings exposes profile, security, sign-out, workspace defaults and selected integration credentials.
- Product Studio reads live Printify/Printful catalogs using encrypted workspace credentials.
- Store/fulfillment selection uses the canonical `commerce.enabled_channels` and `commerce.fulfillment_providers` settings.

Password-reset delivery requires `RESEND_API_KEY`; `AUTH_FROM_EMAIL` is optional but recommended for a verified sender domain.

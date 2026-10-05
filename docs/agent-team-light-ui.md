# Agent team + light UI tranche

- Public homepage is light-first and reframed around a coordinated team of specialized agents.
- Typography is constrained to a small reusable scale via `st-label`, `st-body`, `st-heading`, and `st-hero`.
- App shell and primary auth screens use the same light visual language.
- `/agents` exposes built-in specialist roles and persists workspace custom agents under `agents.custom`.
- Custom agents can be enabled/disabled/removed and carry role, instructions, and model preference metadata.
- Existing runtime still uses hard-coded specialist steps; the next runtime tranche will route execution through configurable agent profiles and ZeroAI-controlled handoffs.
- Signup UX now includes password confirmation, clearer errors, and network-failure messaging.

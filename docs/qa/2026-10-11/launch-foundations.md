# Launch foundations — 11 October 2026

Scope: SEO and direct Paddle sandbox preparation. No live payment activation, paid upgrades, provider account registration, production billing schema changes or VOVERE changes.

## Passed

- `npm run check` and production `npm run build`.
- `node tests/paddle-sandbox.mjs`: signature verification over original bytes, rotation signatures, five-second past/future tolerance, duplicate timestamp rejection, unsigned/modified/oversized payloads, disabled/live-key/live-mode guards, allowed price mapping, customer mismatch, provider error sanitization and sandbox-only portal URL. All transports mocked; no real Paddle call or card charge.
- HTTP inspection of locally served landing HTML: content and h1 exist before executing JavaScript; route title/description, canonical, public robots metadata and JSON-LD present.
- HTTP inspection of `/login`, `/cloud?view=documents&org=test` and `/submit`: private noindex metadata and response header; canonical omits query parameters; no public structured-data script.
- Sitemap contains only `https://relay.vovere-studios.com/`.
- Built production Cloudflare worker invoked locally with synthetic Requests: canonical production landing gets index metadata and no noindex response header; production workspace and alternate preview host get noindex headers. No external API calls involved.
- Browser: public rendering hydrates with one main element and no captured error/warning; sign-in while already authenticated opens the real workspace; workspace metadata is generic/private and public schema removed; returning to home restores public metadata and exactly one schema script. No auth/session changes performed.
- Social card rendered and visually inspected at 1200 × 630. Existing VOVERE wordmark paths retained in the editable SVG source.
- `git diff --check`.

## Not verified / not active

- Deployed production SEO after a new publish, search indexing or Search Console submission.
- Real Paddle sandbox account, checkout, provider webhook delivery, subscription persistence, role checks or quota enforcement. Adapter functions have no public endpoint yet.
- Legally finalized/published notices, customer acceptance, approved commercial operation or trade-license classification.
- Load capacity or a guarantee of correct rendering on every device.

Internal legal drafts and launch requirements are recorded in `docs/legal/RELAY_LEGAL_DRAFTS.md` and `docs/RELAY_LAUNCH_READINESS.md`. Changes remain unpushed.

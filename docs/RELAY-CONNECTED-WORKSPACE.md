# Connected workspace — 7 October 2026

The frontend remains local. Supabase project `aadbcovypefhlpsmoinn` hosts the database, private storage and guest intake function. `/app` is the separate browser-local demonstration. `/cloud` uses authenticated company data and contains no seeded demo records.

## Implemented

- Company onboarding, workspace selection, supplier creation/editing and related requirements.
- Overview, suppliers, private documents, requests, products, company discovery, activity, team and settings.
- Company directory is opt-in and available only to authenticated users. Listing does not publish documents.
- Owners manage membership; administrators manage company information; members have read access. Invite links require the exact confirmed invited email, expire in seven days and can be revoked. Raw tokens are returned once; only fingerprints are stored.
- Private PDF, PNG and JPEG uploads, downloads and targeted company document sharing. Revocation removes future database and uncached storage access; previously downloaded copies cannot be withdrawn. Downloads use a fresh cache nonce and no-store.
- Guest upload links expire in fourteen days, accept at most five files, and can be revoked. The public Edge Function validates the capability and uses server credentials; guests receive no database access. File format signatures and 10 MB individual limits are checked. Temporary upload reservations expire and release capacity after ten minutes. Submission records, request receipt and activity are committed together. Received files remain unverified.
- `/submit#token=…` allows submission without an account and promotes creating a Relay account after success. Tokens are in the fragment, not query strings.
- Certificate review records metadata and verification atomically. Document requirements cannot be satisfied without supporting evidence.
- Password recovery and account password update screens, pending invitation continuation after login, accessible dialogs, mobile navigation focus containment, route focus/title updates and reduced-motion support.

## Verified

Production build and TypeScript checks passed. Rollback integration test: `supabase/tests/workspace_integration.sql`. It checks tenant separation, invitation acceptance, member privilege denial, shared-document access/revocation, atomic certificate review, stale upload capacity recovery and submission replay rejection.

Two disposable confirmed accounts were used for real Auth/API/Storage integration: fresh company onboarding; opt-in company discovery; recipient download; revoked recipient download denied using a fresh cache nonce; confirmed-email invitation acceptance; invitation replay denied. Protected document deletion was checked separately from allowed orphan cleanup.

Browser checks: real login/onboarding, supplier persistence, request persistence, settings persistence, guest file selection and successful submission, received file visible with submitting contact and awaiting-review state. Responsive views checked at actual widths 1021 and 390 CSS pixels; mobile document layout and overview had no horizontal document overflow. Marketing dot and scene control numbers removed; section caption reads “The product”; scroll chapter switching checked. Temporary test accounts, organizations and storage objects were removed after testing.

## Open for production

- Email provider, sender and SMTP have deliberately not been selected. Team invitations and supplier requests currently provide copyable links; they do not claim email delivery. Auth email delivery/recovery with a production sender has not been tested. Workspace email preference is saved but not dispatched.
- Hosting and the final public origin, with matching Supabase Auth redirect allowlist, are still required. Localhost links work on this computer only. A future subdomain can be configured without changing the studio site.
- ChatGPT/MCP integration has not been implemented. It needs an explicit authorization design; documents must remain private.
- Supabase's security advisor reports leaked-password protection disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Enable when supported by the selected project plan. The reservation table has RLS and no user policies intentionally: all client privileges are revoked and only the server intake RPC may use it. Other advisor notices about unused indexes reflect the currently empty database; required foreign-key indexes were added.

These checks establish the tested behavior, not an assertion that all possible production failures are impossible. VOVERE Studios was not modified.

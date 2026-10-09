# Production activation review — 9 October 2026

Prepared locally, **not applied**: `20261009074518_relay_company_exchange.sql` and `20261009075113_relay_private_profile_images.sql`.

The automatic approval reviewer rejected the company-exchange migration twice because it creates production security-definer APIs, a request trigger and document-sharing mutations whose cross-company behavior was not yet sufficiently verified. The revision removes old-request backfill, snapshot replacement and automatic reactivation of revoked document shares. Existing auth, roles and tenant policies are not weakened.

## Concrete changes to approve

1. Private exchange request/receipt tables and an insert trigger: a **new** request for a supplier already connected to a registered RELAY company is put into that company's inbox. No emails are dispatched. Old requests are not backfilled.
2. Authenticated RPC: company members can read their own inbox. Only existing company owners/admins can explicitly select and send their company's active documents. An external upload-link holder who signs in can select documents from a company they already manage. Recipient is derived from the request/link, not chosen from an arbitrary payload. Revoked shares are rejected, duplicate sends are idempotent, expired/revoked/full links and trashed suppliers are rejected.
3. Optional avatar path on the account's existing profile plus a private Storage bucket (`relay-avatars`), 4 MB image limit and owner-only read/write/delete policies. No paid plan is enabled.

Apply to project `aadbcovypefhlpsmoinn` only, then run `supabase/tests/company_exchange.sql` in one rollback transaction, re-run existing workflow/archive tests and inspect security/performance advisors. After those checks pass, enable `COMPANY_EXCHANGE_ENABLED` in `src/lib/feature-activation.ts`, rebuild and publish. The release gate avoids calling missing production APIs and does not replace Supabase authorization. Real end-to-end delivery is not claimed before these steps. Account images currently remain gated by the missing schema; direct exchange currently shows an activation notice. Existing upload-link intake still works.

The supplier working page, settings grouping, profile-name editing, native confirmation/recovery and overview health/expiry widgets are independent of this activation.


The local test suite now also covers filters before pagination, expired links and rejection of previously revoked shares. These cases are prepared, not executed. A dedicated company-owned document library and scheduled reminder mail remain separate product work; existing supplier-associated company documents are the source supported by the prepared exchange API.

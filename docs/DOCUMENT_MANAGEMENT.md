# RELAY document management — implementation status

11 October 2026. Activated in the RELAY production Supabase project after the user's explicit approval. Frontend publishing is a separate Lovable deployment step.

## Product behavior

- Documents is the company's own library (`supplier_id is null`), with search and pagination. Uploads from this page belong to the current company.
- Supplier documents and files received from another registered company appear in that supplier's Documents tab.
- Owners/admins can review, reject with a reason, move documents/requirements to Trash and restore them. Members can read available files and review outcomes.
- Removing a stored original retains its bytes, hides metadata/file access, clears linked active requirements and revokes previous shares. Restore does not reactivate those shares.
- Reviewing a file is a human decision, not a guarantee of authenticity. Rejection preserves the file for review and makes its linked requirements missing.
- A recipient's review/removal of a shared reference applies only to its own workspace. It does not change/delete the sender's original. A declined review appears in the sender's updates. Restoration requires that the sender still grants access.
- Requirements in Trash do not count in supplier health. They can be restored; unavailable/rejected evidence is cleared on restore.
- Updates in Inbox and Activity use the same timeline, with date groups, category, time and destination links. The new snapshot merges duplicate activity/event copies while preserving guest-submission details and supplier context.
- Active outgoing shares have separate pagination, filename, recipient and recipient-review status.

## Activation and verification

Applied migrations (production project `aadbcovypefhlpsmoinn`):
- `20261011095956_relay_document_lifecycle.sql` — document/requirement recovery, reviews and workspace scope.
- `20261011104055_relay_exchange_picker_alias.sql` — fixes a pre-existing PL/pgSQL row-alias/UUID-variable ambiguity in the sharing picker, discovered by the lifecycle suite.
- `20261011104200_relay_resource_trash_fk_indexes.sql` — covers both new composite Trash foreign keys.

The first activation attempt was rejected by automatic approval review. The user subsequently explicitly confirmed production activation; migrations were then applied through the Supabase migration tool.

The snapshot publishes `documentLifecycle: true` after activation. New review/removal/trash controls remain hidden until this capability is returned; the existing Mark as reviewed action continues to work with the existing database. Server-side own-library counts/filtering, shared-file relocation and new update metadata depend on activation.

Completed validation:
- TypeScript and production client/server build passed.
- Browser checked own-library layout and company upload context at a narrow phone viewport; no horizontal overflow measured at 391 CSS pixels.
- Inbox Updates rendered categories/time/navigation. Desktop DOM measurements at 1444 CSS pixels showed no page-width overflow. Viewport override was reset afterward.
- Browser exercised reject with reason, accept after review, move to Trash and restore using the explicitly disposable `RELAY-test-only.pdf`. The file is restored to its initial Reviewed state. Audit events from this test remain visible; customer documents were not used.
- Mobile Trash and restored library checked at 391 CSS pixels with no page-width overflow; screenshots in `docs/qa/2026-10-11/`.
- `supabase/tests/document_lifecycle.sql` passed against production in a rollback transaction. It covers company-vs-supplier scope, search/pagination beyond 50 files, permissions, rejection/evidence guards, recovery, file access, sender/recipient separation and supplier-health counts. Storage cleanup is checked through its restrictive policy/helper because Supabase forbids direct storage-table deletes.
- Both existing `company_exchange.sql` and `company_owned_exchange.sql` regression suites passed. Test users and fixtures were rolled back; a follow-up query confirmed zero leftover fixture users.
- Supabase security advisors report intentional deny-by-default private tables with no direct-access RLS policies, plus the existing Auth leaked-password-protection warning. No new function search-path/security-definer-view warnings were reported.
- Performance advisors no longer report either new Trash foreign key as unindexed. Three existing unrelated platform-administration foreign keys remain advisory findings; new indexes are retained despite low-traffic unused-index notices.

Advisor references: [private tables without direct-access policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). No paid plan or Auth settings were changed. Production mailbox delivery and high-concurrency load testing are outside this activation verification.

## Future AI

Keep machine analysis separate from the human review status. Add per-document/page jobs with bounded concurrency, retries, model/version provenance and a cost allowance per company. Start with document extraction, expiry/issuer/standard checks and inconsistency signals. Show evidence for a reviewer to decide; do not claim that an AI can certify authenticity or reliably detect every forgery.

Pricing and measured provider capacity: `docs/RELAY_PRICING_MODEL.md`. No billing, quotas, purchases or paid plans were activated.

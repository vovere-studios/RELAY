# RELAY connected workspace — 10 October 2026

This pass extends the authenticated workspace. It is not a claim that every planned product feature is production-ready.

## Implemented locally

- Company-scoped global search over suppliers, documents, products and requests, with bounded results, cancellation and Cmd/Ctrl-K navigation.
- Inbox and an Overview task widget: certificate deadlines, document reviews, open outgoing requests and missing supplier requirements. Tasks link to their source; no artificial read/dismiss state.
- Private image/PDF document preview, explicit operational review and downloads. Shared-document navigation uses the document ID, not the share ID.
- Targeted product and request details beyond the first list page. Product edits participate in unsaved-change guards.
- Supplier keyword searches saved per account and company on this device. Search terms and pagination are retained in detail navigation. Filter/preview URL updates no longer reset input focus or scroll; returning from a supplier detail restores the stored list position.
- Document multi-selection carries into the existing explicit-recipient sharing dialog. The UI enforces the database's 20-file limit, and clears selection after confirmed sharing.
- Team invitation server endpoint uses the authenticated user's permissions and existing database invitation limit, then submits transactional email through the existing Lovable SDK when configured. Copyable private links remain available if delivery is unavailable. No invitation was sent during this pass.
- Shared inline error presentation, restrained Inbox tab motion, responsive segments and company-scoped navigation grouping.

## Verified

- TypeScript and production builds pass.
- Local invitation endpoint rejects missing authentication (401), foreign Origin (403), invalid inputs (400), and bodies exceeding 2 KB (413). These tests create no invitations.
- Authenticated browser checks: 1280px desktop, 390px mobile, 320px mobile; light and dark appearance; Inbox/Updates navigation; mobile navigation sheet; search opening with Cmd-K and closing with Ctrl-K; empty search; saving and removing a local supplier search; preserved input focus while changing its URL-backed filter; private-document unavailable error, explicit retry/close; no horizontal page overflow at 320px.
- Current owner workspace has no active suppliers or files. Its existing activity records were used for the Inbox screenshot. No business records were created, restored, modified or removed during browser QA.

## Explicit limits and remaining work

- No physical iOS/Android device testing, load benchmark, positive real-file review/share test, or actual invitation email delivery test was performed.
- Document version history and scheduled expiry emails are not implemented by this pass. Expiry tasks are visible in the Inbox.
- Direct company exchange and private profile images remain disabled: their prepared migrations are local and unapplied. Automatic approval review rejected production activation because it requires explicit approval of the new tables, functions and access rules. The approval question remains open.
- No production deployment or Git push was performed. VOVERE Studios was not modified.

Screenshots: `inbox-desktop.png`, `inbox-mobile.png`.

## Generated-link follow-up

The result now expands from the generating control with a measured-height, damped animation, a subtle inner arrival, and a reduced-motion fallback. The layout groups the private URL with Copy and Preview; mobile stacks the controls. Invitation guidance uses email-specific wording. Desktop and 390px mobile presentation were checked in a temporary local React fixture with an inert `relay.example` test URL; the copied state was simulated only for visual QA. No production upload link or invitation was created. The temporary fixture was removed. Screenshots: `generated-link-desktop.png`, `generated-link-mobile.png`.


## Authenticated upload-link response — 10 October

Company Exchange migration activated in project aadbcovypefhlpsmoinn after explicit user approval. SQL fixtures in supabase/tests/company_exchange.sql passed and rolled back: routing, outsider denial, member read/admin sharing, document ownership, duplicate submission, expiration, revoked access and archived supplier isolation. Security advisors show no new WARN/ERROR for the exchange implementation; private tables intentionally deny direct access through revoked grants and RLS without policies. Existing leaked-password protection warning remains (passwordless auth).

The public intake validates the link before authenticated redirect; login retains the fragment token in session storage. Dashboard return=intake now renders a dedicated document-selection view instead of redirecting back to the guest form. Direct guest upload uses guest=1 to avoid a redirect loop. Tokens stay out of URL query strings. Existing exchange APIs perform all authorization checks; no automatic sharing occurs. Link limits constrain selection. Missing link was verified in the authenticated browser (screenshot intake-response-missing-link.png). No real documents were shared or emails sent for UI QA.

Company-owned uploads are prepared behind COMPANY_DOCUMENT_UPLOAD_ENABLED=false. The separate company-owned-documents migration is not applied and awaits explicit approval. CLI was unavailable; the migration filename was generated from the actual UTC clock. New upload keeps saving and sending separate, validates format signatures and cleans up orphan uploads on metadata failure. Requires production migration and tenant tests before activation.

Automatic submission confirmation emails are still not implemented. Current dashboard notifications are workspace events written atomically by the exchange API. Guest confirmations, own-document upload activation and full successful browser round-trip still require follow-up; do not describe the entire response workflow as production-complete.


Follow-up: submission-email server endpoint is now prepared. It verifies bearer identity, derives recipients through a service-only database function from an existing completed sharing receipt and checks sender administrator rights. Request bodies cannot specify email recipients. Stable hashed-recipient idempotency keys protect retries. UI distinguishes committed document sharing from email failure and offers a separate email retry. Requires the second migration, LOVABLE_API_KEY and server-only RELAY_SUPABASE_SECRET_KEY in Lovable before activation. Guest email delivery is not implemented yet. A new company_owned_exchange.sql fixture suite is prepared but not run because that migration is awaiting approval.


## Own company files activated and uploaded

User explicitly approved activation and a harmless PDF upload, provided there are no purchases or plan changes. Applied relay_company_owned_documents to external RELAY project. company_owned_exchange.sql passed and rolled all fixtures back. Delivery-address RPC privileges verified: authenticated=false, anon=false, service_role=true. Enabled company-document upload gate; added My company option to the actual document dialog, without requiring a Supplier record.

Uploaded RELAY-test-only.pdf through the authenticated UI into VOVERE Studios as Company information. Database verification: supplier_id is NULL, Storage object exists, document_shares count is zero. The harmless file is retained in the workspace as requested; it was not shared with another company. No purchase, subscription or plan change occurred. Production build passed. Automatic confirmation-mail delivery remains dependent on server secret setup; no email delivery is claimed.


## Guest upload confirmation and receipt spacing

Root causes: guest uploads never called a confirmation endpoint; main.public-main had higher specificity than .intake-main and erased vertical padding. Fixed intake-specific main spacing plus explicit success-card gaps, signup-copy spacing, and footer separation. Extracted IntakeReceipt for reuse and visual QA. Desktop at CSS 1280px: header-to-card gap 102px, card-to-footer gap 96px, no horizontal overflow. Mobile at CSS 390px: card-to-footer gap 64px, no horizontal overflow. Screenshots use clearly fictional Example Company data and a simulated sent-mail state; they do not demonstrate real delivery. Temporary QA HTML/TSX removed.

Guest confirmation endpoint accepts the secret link token, completed reservation ID and 1-5 document IDs. It verifies the reservation's link, completed state, count, stored document ownership, submission timestamp window and common stored contact before deriving receiving owner/admin emails. Addresses are not accepted from the request. Repeated attempts use the reservation ID and recipient hash as stable provider idempotency keys. Successful file delivery stays committed if mail fails; UI reports failure and offers a separate retry.

Supabase relay-intake deployed as version 4, preserving existing verify_jwt=false capability-link validation. Only added document_ids/reservation_id to the successful response; previous deployed source compared before update. Existing clients remain compatible. No schema migration added. Real emails were not sent during QA. Actual inbox delivery requires publishing the frontend/server update and a new approved submission.

Mail SDK tests passed: sender/requester routing, HTML escaping, guest copy (no false claim of stored originals), retry idempotency, rejected provider response and network failure. Production build and invalid-request endpoint checks recorded separately.

## Supplier requests and requirements

Added a supplier-scoped, tenant-filtered open-request query with ten-row pagination, timeout, cancellation and inline retry. The section stays above all supplier tabs and opens the existing request details without leaving the supplier. Received requests are excluded. Reloading the workspace after request creation refreshes this section.

Verified against existing Vertex GmbH requests: ISO2009 and TEST both appear, ordered by due date; opening ISO2009 from the supplier shows the correct request and supplier. No production records were created or changed for this check. Day & Night Service correctly shows no open requests.

Requirements now separate the name, evidence type and status in a dedicated heading, with evidence and action controls below. Checked real requirements at CSS widths 1280 and 390; mobile has no horizontal overflow. Production build and diff whitespace checks passed. Screenshots: supplier-open-requests.png, supplier-requirements-mobile.png.

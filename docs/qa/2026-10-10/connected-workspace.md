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

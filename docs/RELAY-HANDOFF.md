# RELAY handoff — 8 October 2026, updated after real-dashboard pass

## Current direction
Real dashboard `/cloud` and public site are primary. Demo is lazy-loaded and remains secondary. VOVERE Studios code/site must never be changed. No paid upgrades. Main is connected to Lovable; preserve published history, never force push or rewrite commits. GitHub https://github.com/vovere-studios/RELAY.git.

The interrupted architecture work has now been continued and tested. See `docs/RELAY-POLISH-QA.md` for the full Before/After/Why review, actual verification and remaining limits. Check git status/log for final push status rather than assuming from this document.

## Implemented
- Real dashboard reads one authorized, view-scoped snapshot rather than loading nearly every table. Lists capped at 50 with stable page order. Aggregate overview counts independent from visible pages. Supplier search/picker and share-document search are bounded, with selected shared documents retained during search.
- Cancels stale requests, generation checks, 12s request timeout; no fake loading delay.
- Settings: appearance Light/Dark/System, company identity, visibility, truthful notification-delivery status, verified email/company role. Dirty/saved states, discard, link/company-switch/sign-out/unload guards. Browser Back for unsaved SPA forms remains a specific review item.
- Header theme switch, shared ThemeProvider, OS and cross-tab synchronization.
- Four optional overview widgets (network, attention, activity, privacy), saved per user/company/device in local browser storage. No cross-device preference sync claimed.
- Demo pages/provider separated into lazy `/app/*` route. Legacy `/preview-setup` now redirects to real signup.
- Independent `/admin` for RELAY operators, not ordinary company owners. Company search and page navigation, suspension/reactivation with mandatory reason and audit. Suspension blocks company access and hides directory listing; pending invitation/upload links revoked. Data retained. Reactivation does not restore listing/revoked links. Operator-owned workspaces protected from suspension.
- Operator account bootstrapped server-side from existing confirmed `admin@vovere-studios.com`. No user_metadata-based privilege checks.
- `/api/admin/action`: bearer-token authentication and server authorization via Supabase, same-origin check, bounded request stream; performs admin action then sends optional operator notification with Lovable. Saved access change remains valid if notification fails; UI reports delivery status. Production send not mailbox-tested.
- Auth mail arrows removed, light/dark adaptation, real VOVERE image and restored footer spacing. All six existing auth actions preserved.

## Backend already applied to RELAY
Supabase project aadbcovypefhlpsmoinn.
Migrations applied: 20261008102405_relay_paged_workspace, 20261008105208_relay_platform_admin, 20261008105717_relay_snapshot_picker_filters, 20261008105829_relay_operator_ui_and_guards.
Public `relay_workspace_snapshot` and `relay_platform_admin` are invoker wrappers. Actual implementations live in unexposed `relay_private` with narrow auth/company/operator checks, fixed search_path, statement timeout. Private tables deny direct client access. Suspension integrated into membership helper/RLS and document/intake/membership guards. Never replace with permissive policies to fix errors.

## Verified / remaining
Both rollback SQL suites passed, including 151-row pagination/search, tenant isolation, operator isolation, suspension/reactivation, invitation and sharing/integration workflows. Fixture user count verified zero afterward. Nine real views at 320/768/1281 CSS px; public website at same widths; no horizontal overflow or rendered errors in these scans. Settings appearance/discard and widget hide/restore tested in actual owner session. Admin loaded; unsigned action returned 401. Current release build must be verified from latest command result/log.

Not demonstrated: thousands of concurrent users, physical-device/browser matrix, production email mailbox delivery. Automatic registration alerts/team invitations/supplier-request delivery, social providers, cross-device widget settings, exhaustive unsaved SPA Back protection remain future items. Performance advisor unused indexes should not be deleted merely because new project has low traffic. Existing auth leaked-password-protection warning remains; do not buy upgrades silently.

## Existing services and constraints
Owner email admin@vovere-studios.com, owner user 1e9d94bb-7e5c-4ff8-9036-47169f4ff8ca, company 83462950-0acc-4df1-91ad-7b16e8298644 VOVERE Studios. Company owner role and platform operator membership are independent.
External Supabase stores accounts/workspaces/documents. Lovable hosts application and sends auth emails via signed hook https://relay.vovere-studios.com/api/auth/email-hook. Server secret RELAY_AUTH_EMAIL_HOOK_SECRET (legacy alias supported), LOVABLE_API_KEY server only. Never print secrets or ask for email codes in chat.
Sender RELAY <noreply@relay.vovere-studios.com>, delegated sending domain notify.relay.vovere-studios.com, reply admin@vovere-studios.com. Google/Microsoft/Apple not configured. Publish latest GitHub in Lovable separately; push alone is not proof of publishing.

## Runtime
Project is in iCloud; file reads/Git stats occasionally stall. node_modules symlink to /Users/maximilianriedl/.cache/relay-polish-runtime/node_modules. Ignore preserved node_modules.icloud-backup* directories.
Node PATH /Users/maximilianriedl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin. Dev port5174 reads original source. For new TanStack API routes Vite must regenerate src/routeTree.gen.ts before tsc knows route IDs.
Use npm run check/build, git diff --check, rollback SQL suites and CUA browser verification. Do not replace source with old runtime cache blindly.
Screenshots and measured viewport report in /Users/maximilianriedl/.cache/relay-local-runtime/relay-real-* and relay-platform-admin.png, relay-auth-email-polish.png. Temporary public mail preview removed.
Relevant skills: VOVERE Brand OS, Emil design engineering, Supabase and Postgres best practices. VOVERE reference checkout read-only at /Users/maximilianriedl/.cache/vovere-relay-readonly-audit-20261007.

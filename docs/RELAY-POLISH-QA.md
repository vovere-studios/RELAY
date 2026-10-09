# RELAY polish verification — 8 October 2026

## Changes

| Before | After | Why |
| --- | --- | --- |
| Word masks clip close to the letterforms | Optical padding on all four edges | Preserve glyph edges and descenders during reveals |
| Small native selects with different platform menus | Shared 50px controls and a themed popover menu | Match input sizing and make long supplier names readable |
| Supplier detail tabs extend beyond small screens | Two-column tabs with a two-dimensional active indicator | Keep every label visible without horizontal scrolling |
| Preview grids use intrinsic minimum widths | Shrinkable grid columns and wrapping record names | Avoid sideways overflow on phones |
| Supplier identity appears early and scales from 80% | Later arrival from 94%, longer eased reveal and softer scroll catch-up | Make the Perspective transition feel controlled |
| Loading is mostly plain text | Three-line sequential activity indicator tied to pending state | Show genuine work without fake progress or artificial delays |
| Date input has inconsistent sizing | Shared 50px sizing, theme-aware native date picker | Preserve platform input support while matching the form |

## Verified

- TypeScript and the production client/server build.
- Marketing page at measured CSS viewport widths 320, 390, 768 and 1281px: no document horizontal overflow. The animated headline has intentional visible optical overflow; its parent does not clip it.
- Overview, suppliers, documents, requests, products, organization, login and signup at measured widths 320, 768 and 1281px: no document horizontal overflow or clipped text containers detected.
- Supplier detail with the German name “Brückner Materials GmbH” at 320/340px; all seven tab labels remain visible.
- Supplier/document selection in a modal, keyboard ArrowDown/Enter, form value preservation, selected checkmark, and controlled supplier sorting.
- Required country selection remains invalid until a selection is made. Missing selection shows an accessible error; selecting Germany stores DE and clears the error. No supplier created for this check.
- Escape closes the menu while the active dialog remains open; a second Escape closes the dialog. Outside pointer dismissal and focus return are supported.
- Light and dark menu presentation; mobile request modal with localized German native date placeholder.
- Perspective scene inspected at entry and during the supplier identity transition.
- Reduced-motion paths are retained in GSAP and CSS. Keyboard-opened menus do not animate.

## Scope

The current product interface is English. This pass checks German company names and localized native browser date/validation UI; it does not add or claim a full German translation. Browser QA used Chromium through the Codex in-app browser, not physical Android/iOS devices or Safari. Responsive checks are evidence for the tested sizes, not a guarantee for every browser and device. The authenticated Supabase workspace was compiled and uses the same controls; no production data was changed during this UI pass.

## Sidebar and interaction follow-up — 8 October 2026

| Before | After | Why |
| --- | --- | --- |
| Workspace select inherited 16px form typography and nested horizontal padding | Sidebar-only 13px typography, 40px minimum height, 11px internal padding; outer horizontal padding removed | Company name gets more room without oversized form styling; long names can still wrap |
| Compact panel arrival 320ms with unbounded child staggering | 240ms arrival, 220ms children, stagger capped at 60ms | Frequent switches settle promptly |
| Dialog entrance 520ms, children delayed up to 215ms | 340ms entrance, smaller travel, children delayed at most 110ms | Retain depth with faster access to controls |

Browser verification: connected sidebar trigger measured 161px wide and 40px high in the normal desktop viewport. The browser session did not have an authenticated workspace, so the real VOVERE Studios option could not be visually verified in that session. Demo dialog opened successfully. Shared form select sizes remain unchanged. Reduced-motion branches remain intact. Marketing scroll choreography was not altered in this follow-up.

## Real dashboard, platform administration and email — 8 October 2026

| Before | After | Why |
| --- | --- | --- |
| Startup fetched nearly every company table through many requests | One authorized snapshot per active view, stable 50-row pages, server-side search and full-company metrics | Bound transfer and rendering as data grows |
| Stale requests continued during rapid view changes | AbortController cancellation, generation checks and 12s browser timeout | Avoid stale content and indefinite refresh states |
| Real dashboard had no appearance control | Header toggle and Settings Light/Dark/System, OS and cross-tab synchronization | Same usable theme system for the real product |
| Settings labels sat beside inputs; narrow header overlapped | Stacked full-width fields, 44px header controls, removed narrow-screen status label | Clear hierarchy and adequate touch targets |
| Company owner was confused with platform owner | Independent `/admin` operator access, server authorization, audit and reversible suspension | Company ownership never authorizes platform administration |
| Fixed overview | Four optional widgets with account/company/device-scoped saved layout | User can focus the overview without extra data requests |
| Text arrow in email branding and links | Arrow removed; adaptive light/dark markup and restored footer breathing room | More restrained mail typography |

### Verified
- Existing rollback-only workflow suite passed: tenant isolation, invitation role restrictions, sharing/revocation, certificate integrity, guest intake reservation/replay.
- New `supabase/tests/platform_and_paging.sql` passed before and after private function wrappers: 151 suppliers, first/last pages, search outside first page, ordinary owner denied operator access, suspended company denied direct reads and snapshot access, reactivation retained all 151 rows, anonymous snapshot denied. All fixtures rolled back; fixture user count confirmed zero.
- All nine REAL dashboard sections opened in the authenticated VOVERE Studios owner account at measured 320, 768 and 1281 CSS px. No horizontal document overflow and no rendered main error alerts in this scan.
- Appearance switched Light/Dark; selected state and theme updated. Widget hide and restore changed the actual overview. Settings dirty/save state and discard were verified without changing company data.
- Public site opened at measured 320/768/1281; no horizontal overflow. Current browser error log returned no entries.
- `/admin` loaded for the explicitly bootstrapped operator account. Operator workspace protected from suspension. Admin change endpoint rejected unsigned requests with HTTP 401.
- Auth email markup: no arrow glyph, dark-mode CSS present, real VOVERE image loaded, no horizontal overflow in browser preview.
- TypeScript and production builds completed during the pass; rerun final build after final source changes before committing.

### Production and test limits
This is NOT a concurrent load test for thousands of active users, an exhaustive device matrix, or proof of actual email-client rendering and mailbox delivery. Browser testing used Chromium with responsive viewports, not physical iOS/Android devices. Company datasets on the logged-in owner account are small; page boundaries were separately verified with rollback fixtures. No upgrade or paid infrastructure was enabled.

Private admin tables deliberately deny direct client access and have no public RLS policy. Public RPCs are security-invoker wrappers around narrowly authorized private implementations. Security advisors retain informational deny-default policy notices and the existing leaked-password-protection warning; passwordless sign-in does not remove that configuration warning. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Operator-change email notifications use the existing Lovable server key and report unavailable delivery separately from saved access changes. Production delivery must be checked after publishing. Automatic registration alerts, team invitations and supplier-request emails are not implemented by this pass. Browser Back protection for unsaved SPA forms requires further review; unload, link navigation, company switching and sign-out have guards.


## Real-workspace interaction refinement — 8 October 2026

| Before | After | Why |
| --- | --- | --- |
| Save actions closed immediately or relied on a generic toast | Muted green confirmation/check held briefly after actual success; red retry/error state after failure | Make outcomes visible at the action itself |
| Icons inherited the same northeast movement | Plus contracts within a ring, upload stem moves within its tray, adjustment knobs move within their tracks | Motion describes each action without travelling glyphs |
| Dialog shell/content used one generic arrival | Material expands from the opener; content enters independently; exit returns toward the opener | Connect action and surface while keeping text undistorted |
| Switching forms could briefly reuse the previous form DOM | Fresh body session before committing the new fields; old contents retained through exit | Prevent leaked inputs and controlled/uncontrolled warnings |
| Customize mixed long labels with uneven control positioning | Fixed switch column, live miniature preview, fixed footer and independently scrolling body | Keep actions accessible on short displays |
| Missing required input triggered a browser bubble | Inline field errors, first invalid field focus, retained form data | Keep validation within the product's visual system |
| Disabled save lost keyboard focus after an error | Retry button recovers focus when the browser returns it to the body | Support retry without a pointer |
| Toast used the same check for all messages | Semantic success/error/info and paused countdown on hidden tabs | Accurate, readable feedback |

Real authenticated workspace checked: Add Supplier missing-field validation (no writes), close/reopen reset, product supplier popover, two-stage Escape handling, native focus return, Customize internal scrolling and right-column alignment. Actual workspace displayed at 907x510 CSS px in this pass; wider responsive matrix above belongs to the preceding pass. A disposable local component probe tested controlled 700ms success/failure, success hold/close, failure retention/reset/retry, sage/red presentation including dark mode. These controlled replies do not prove production database or email delivery. Fresh page/form switching produced no new console warnings after the session fix. Temporary probe source and public entry were removed before the final build.

Design reference inspected read-only: current VOVERE contact dialog, submission confirmation, liquid-glass surface, signature arrow and motion source at ce0d292; live contact surface viewed without submitting. VOVERE source and website unchanged. Brand OS and Emil references were explicitly retired by the user and are no longer applied.

Final verification for this interaction pass: `npm run build` completed successfully (TypeScript, client/server and Nitro bundles); `git diff --check` passed. No backend or production workspace data was altered by this pass.

## Queued feedback: mobile navigation and outcome motion — 8 October 2026

This follow-up supersedes the ring icon and sage colour choice recorded above.

| Before | After | Why |
| --- | --- | --- |
| Add Supplier plus contracted inside a ring | Plain anchored plus with the button's pressed feedback | Remove the explicitly rejected embellishment |
| Pale sage/red outcomes | Clear mint green and coral red with adapted dark colours | Make saved/retry states easier to distinguish in a monochrome workspace |
| Labels faded at the same position | Short masked vertical settling, fixed label footprint, drawn check and one success highlight | Outcome reads as a transition without moving neighbouring controls |
| Mobile opened the desktop sidebar | Native modal navigation with current location, grouped links, company switch and a fixed account footer | Give mobile its own usable layout and scroll ownership |
| Manual sidebar focus trap/Escape logic | Native Dialog with separate popover Escape and counted nested scroll locks | Closing a selection must not close the navigation or strand body scrolling |
| Browser confirm for unsaved in-app departure | RELAY dialog with Keep editing / Leave without saving | Keep the decision and feedback inside the product |
| Current destination could clear dirty state | Current destination/company preserves input and dirty state | Unsaved values must never appear saved |
| Focused fields and validation lacked one rhythm | Shared focus ring and inline-message arrival; narrow search flex width corrected | Coherent input response and no search-icon wrapping on narrow screens |
| Public menu icon was static | Two-bar/close morph; 44px opener and 48px destination rows | Clearer touch and navigation feedback |
| Public FAQ/CTA led with local preview | Real account capabilities explained with separate demo clearly identified | Match the actual product journey |

### Verification of this follow-up
- Real owner account: all nine sections opened through the mobile menu at measured 320x740 CSS px and the desktop sidebar at 907x510. No horizontal document overflow or main error alerts in these scans.
- Actual mobile menu and Supplier required-field validation viewed at 390x844; menu also viewed in dark mode. No supplier/company/member data was saved for QA.
- At 320, menu body scrolled 123px independently while the account footer remained within the viewport. All destinations remained reachable. Company popover Escape collapsed only the selection.
- Nested Settings departure: Keep editing retained the changed field; closing the menu restored body scrolling. Leave without saving returned to Suppliers, cleared the scroll lock, and restored focus to Open navigation. Same-page Settings selection retained dirty input; Discard restored VOVERE Studios.
- Public navigation at 320: 44px opener, four 48px links, no horizontal overflow, Escape collapsed menu and restored opener focus.
- Disposable controlled component probe: one operation started despite a second action during pending/confirmation; success completed its callback; rejection remained retryable; retry succeeded. Light and dark shared action styles viewed. No backend writes; probe source and public entry removed before build.
- Actual Add Supplier motion captured in eight differing frames across 346ms (`relay-new-dialog-motion.webp`). Fresh real workspace console warning/error query returned no entries. Viewport override reset; original Light preference restored.

The wider 768/1281 scans and database rollback suites above belong to the earlier architecture pass. This follow-up is Chromium UI evidence, not a physical-device matrix, concurrent load test or production email verification. Native browser unload prompts remain intentionally available; browser Back protection for dirty SPA forms is still a separate review item.

Primary dashboard references consulted read-only: [Linear's 2026 design refresh](https://linear.app/now/behind-the-latest-design-refresh) and [Linear's custom iOS navigation](https://linear.app/now/linear-liquid-glass). The current VOVERE source remains a read-only reference. Retired Brand OS/Emil skills were not applied.

Final release verification for this follow-up: `npm run build` exited 0 (TypeScript, client/server and Nitro bundles), and `git diff --check` passed. No QA entry/source remains in the worktree or production build. GitHub push sync and Lovable publishing remain distinct steps.

## Supplier lifecycle and interaction pass — 8 October 2026

- Native dialogs now animate their content and material together (380 ms entry / 180 ms exit); removed trigger-to-blank-rectangle FLIP and delayed form arrival. Reduced-motion and keyboard presentation remain immediate.
- Customize is a desktop side inspector / mobile bottom surface, using the actual overview as its preview. Removed duplicate miniature preview and animated slider knobs. Corrected inherited mobile grid placement that squeezed labels.
- Mobile shell uses a rounded floating header; navigation remains a native modal with independent scroll and fixed account controls.
- Shared drawn success/error marks, semantic surfaces, stable-size action buttons, retained input on error, and a short actual-save receipt. No artificial network waiting.
- Supplier Company tab → Remove supplier → impact review → Move to Trash. Suppliers → Trash → Restore. Only company owner/admin. Private rows and storage files remain retained (no permanent purge/retention job is introduced). Old uploads/shares remain revoked after restore.
- Share, upload-link and invitation revocation now have explicit confirmation dialogs.
- Applied `relay_supplier_trash`, `relay_trash_list_alias`, `relay_trash_foreign_key_index` to RELAY only. Snapshot uses active private views before pagination/counts; restrictive RLS and write triggers protect stale callers and definer paths.
- SQL rollback fixtures passed: supplier lifecycle and role/tenant isolation, documents/products hidden, restore preserves documents, prior shares/links stay revoked. Existing workflow integration and 151-row pagination/operator tests also passed. No existing supplier was deleted for QA.
- Security advisor: no new security warning; private deny-all tables intentionally have no client RLS policy. Existing Auth leaked-password protection warning remains: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . This app uses email OTP; no paid setting changed.
- Performance advisor's new composite foreign-key index notice addressed. Existing operator audit/suspension index notices and unused-index notices remain; no production concurrency/load claim.


## Supplier working pages, real insights and settings — 9 October 2026

This pass supersedes the earlier popup supplier detail, validation auto-focus, miniature Customize preview and outstanding SPA Back limitation above. Frontend changes are prepared for the connected GitHub branch. Pending exchange/avatar migrations and their rollback suite stay local and are excluded from this push; publishing in Lovable remains a separate step.

### Implemented

- Suppliers open in the main workspace at their own URL, with Company, Documents, Requirements and Certificates sections. Reload retains the selected section. Read mode uses wrapping company information; editing, cancel and save are explicit. Upload/request forms inherit the supplier context.
- Company, supplier and profile drafts are protected on in-app navigation and browser Back. Keep editing retains the draft; Leave without saving and explicit Discard restore the correct state. Profile drafts remain mounted across Settings sections. Unload still uses the browser's native protection.
- Settings separates Company, Privacy, Appearance and Profile. Dirty sections are marked; account security is reachable from Profile. Existing profile-name saving works. Private profile-image controls are prepared but unavailable until the pending schema is approved.
- Overview has scoped optional Network Health and Document Validity widgets. Network Health is complete supplier profiles / total profiles, with the exact missing-requirement count. Certificate validity uses recorded certificate dates for the next 30 days, bounded results and supplier links. These are in-app insights, not an automatic email reminder service.
- Customize has a desktop inspector and mobile bottom surface, independently scrolling content and aligned switches. Selected rows have no extra grey background. Six widgets were enabled through the owner's actual Customize controls.
- Shared success/error marks draw into the action, with semantic mint/coral colours, stable button footprints and a bounded success hold after an actual completed write. Failure retains input and exposes Retry at the action. Dialog contents/material enter together; reduced-motion remains supported. The rounded mobile shell retains native focus and scrolling behavior.
- Custom selections now dispatch a real bubbling change event, updating parent dirty/error state. Invalid fields retain scroll position rather than calling focus/scrollIntoView. Supplier actions use at least 44px height; supplier tabs use two balanced rows on narrow phones and Settings uses a 2x2 arrangement at 320px.
- Guest-upload success/failure uses the same action feedback. Existing RELAY sign-in and understated registration paths are provided on intake. Login from an intake link goes through workspace bootstrap before returning to the request; pending invitations keep priority. Old unused CloudWorkspace code was removed.

### Verified

- `npm run build` exited 0 after the final source changes: TypeScript, client, SSR and Nitro outputs completed. `git diff --check` passed. Existing Vite/Nitro configuration warnings are retained; no package/config rewrite was needed.
- Nine real sections opened at measured 320 and 1280 CSS px with no horizontal document overflow or rendered main error alerts. Supplier controls were additionally inspected at 390px. This is Chromium responsive evidence, not physical Safari/iOS/Android certification.
- Supplier URL/section survives reload; its heading updates the document title after loading. Company read/edit/cancel and dirty departure were checked. Browser Back → Keep editing retained a changed supplier name; a subsequent Leave returned to the list without saving.
- Profile dirty draft survived Company/Profile switches. Navigation guard and Discard were checked. An actual save of the existing unchanged profile name returned the green Profile saved outcome. Read-only database verification confirmed the owner name remained intact and no QA draft profile name persisted. No supplier/company edits, files or team members were saved for UI QA.
- Required-evidence failure at 320px retained the exact scroll position (528.014px before/after). Product validation showed Retry; selecting Hoptrans through the custom menu reset the parent error and restored Save to workspace, retaining the selected supplier. No product was created.
- Owner Overview shows real data: 2 suppliers, 0 complete profiles, 5 missing requirements, 0 recorded upcoming certificate expiries, 0 private documents and 1 open request at the time of testing. No demo metrics were introduced into the real workspace.
- Public FAQ, marketing-to-demo navigation and a demo supplier page were checked after the Data Router change. Marketing and the demo supplier page had no horizontal overflow at measured 320 and 1280px. An invalid intake URL returned a readable unavailable-link message and a working return to the website. The bootstrap return route without a pending token returned the authenticated owner to their workspace. No fresh registration/mail delivery was performed for this check.
- Two earlier 07:58 Vite HMR errors and one 09:00 temporary router-blocker warning remained in the tab's historical log. Neither repeated after a fresh reload and subsequent supplier/return-path navigation. Marketing's final warning/error log query was empty. Native screenshot proofs are stored locally in `docs/qa/2026-10-09/*.jpg` and are excluded from the application push. Temporary viewport overrides were reset and the owner's original Dark preference restored.
- Supplier Trash migration and rollback suites passed as recorded above: owner/admin permissions, tenant isolation, retained documents, revoked links/shares after restore, existing workflows and 151-row paging. No production supplier was removed by the agent for QA.

### Activation and remaining scope

Automatic approval review rejected production activation of the new company-exchange APIs. `20261009074518_relay_company_exchange.sql` and `20261009075113_relay_private_profile_images.sql` remain **unapplied**. `COMPANY_EXCHANGE_ENABLED` remains false; no unavailable exchange RPC is called by the released UI path. The concrete review is in `docs/RELAY-EXCHANGE-ACTIVATION.md`; explicit approval is pending. No indirect activation through GitHub/Lovable is attempted.

The prepared rollback suite includes request routing, own-tenant reads, member/outsider restrictions, explicit document ownership, idempotency, filters before pagination, expired-link rejection, preserved revoked shares and archive revocation. It has **not run** against the pending migration. No real company-to-company delivery or profile-image upload is claimed.

Further product work remains: a dedicated own-company document library (current documents are supplier-associated), automatic supplier-request/team-invitation delivery, scheduled expiry reminder mail and authenticated cross-company end-to-end delivery after activation. Current existing guest uploads remain available; the newly polished guest-success UI was not tested by sending a real file. Signup bootstrap with a new user is not proven by the existing-owner return test. No concurrent multi-thousand-user load test or exhaustive multilingual/device clipping audit was performed. Pagination, bounded reads, cancellation and tenant tests reduce known risks but do not establish production capacity.

## Action feedback follow-up — 9 October 2026

Supersedes the circled success mark and full-form success overlay described above. Success stays on the original action: mint surface, continuous curved stroke drawn over 520 ms and a brief 620 ms settle, without a circle. Reduced motion disables this movement. Error feedback uses coral, a damped 480 ms refusal movement and a concrete inline message. Every repeated failed attempt restarts that movement; it does not require leaving the error phase.

Removed a later duplicate palette that overrode the intended colors. Dialog action footers remain visible while fields scroll. Parent-handled validation no longer inserts duplicate field messages or automatically focuses/scrolls a field. Required fields are named in one actionable message.

Verified in the real owner's workspace: unchanged profile save returned Profile saved with the fully drawn new stroke and no success circle; repeated native invalid supplier submit incremented the feedback run from 3 to 6 without changing scroll position. At 390 × 844 CSS px, invalid submit retained scroll position 0, had no horizontal overflow and kept the action within the viewport. Light and Dark error surfaces were inspected. No supplier was created, changed or removed. Original Light preference and default viewport were restored. Local screenshots: action-success-dark.jpg, action-error-light.jpg, action-error-dark.jpg and action-error-mobile.jpg.

Final production build (TypeScript, Vite client/server and Nitro) exited 0. Historical HMR blocker warning remained in the QA tab; no new error/warning appeared during this follow-up after reload. These checks do not certify physical-device behavior or production scale. No pending backend activation was performed.

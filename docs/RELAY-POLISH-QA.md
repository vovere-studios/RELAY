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

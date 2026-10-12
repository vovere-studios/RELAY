# RELAY design and motion pass — 11 October 2026

This pass preserves the existing working tree and concentrates on the real workspace, settings and new billing surfaces. It is not an assertion that every product workflow has completed QA.

## Changes

- Settings sections now animate only their visible content. Forms remain mounted, so switching sections preserves unsaved input. The existing moving selection capsule remains intact.
- Fixed duplicate React keys on the billing component and company form. This caused billing to remain in the document after changing sections, pushing the selected settings down the page. Fresh browser tests confirm zero billing surfaces after leaving Billing.
- Every recognised settings section is restored from the URL, including after reload.
- Below 520 CSS pixels the five settings choices use two rows, with the selection capsule following their measured position. The former single row clipped the billing choice.
- Plan prices crossfade through a small vertical movement. Real prices update immediately; outgoing values are hidden from assistive technology. No artificial animated intermediate prices.
- The selected plan is identified on its card. Its review surface enters with a short settling movement, receives focus and has sticky-header scroll clearance. Closing restores focus to the selection button.
- Workspace panels use one short arrival instead of moving the parent and staggering all its children. Marketing panel exits no longer restart whenever their children rerender; the outgoing content retains its latest state.
- Billing refresh is a proper inline control with keyboard focus and press feedback. Its existing refresh rotation remains bound to the actual request.
- Billing confirmation polls run serially, abort on unmount and stop after 30 seconds with an explicit syncing message. A delayed webhook is not presented as completed payment.
- Added movement respects reduced-motion at its start; reduced-motion CSS removes control transitions. No native Apple renderer or SF Symbols files were imported.

## Browser verification

Real authenticated RELAY workspace, English interface:

- Settings at 320 and 390 CSS pixels: no horizontal document overflow; all five settings choices and appearance controls within the viewport.
- Light and dark appearance render correctly; original light preference restored.
- Mobile workspace navigation opens and closes.
- Desktop at 1366 CSS pixels: settings and billing have no horizontal overflow.
- Billing → Appearance removes the billing surface after the React-key fix.
- Choose Core → Close returns focus to Choose Core; selection is exposed by `aria-expanded`.
- Public pricing: monthly/yearly amounts and signup destinations update correctly; no horizontal overflow at 320 CSS pixels.

Screenshots: `settings-motion-desktop.png`, `settings-motion-mobile.png`.

## Validation and limits

TypeScript/production build and the mocked billing-worker test passed during this pass. Worker tests cover origin/auth gates, company-authorised checkout, pending-order reuse, portal access, signed webhooks, original-order binding, exact EUR prices and sanitised errors. No real payments, emails or company-document writes were performed.

No physical Android/iOS device matrix, all-language QA or production load test was performed. Paid billing still requires the operator's Paddle setup and the outstanding release prerequisites. Changes remain local and unpushed.

## Official design references

- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): brief, precise movement that follows expectations and explains status.
- [Apple HIG — Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback): feedback within the current context, with interruption proportional to importance.

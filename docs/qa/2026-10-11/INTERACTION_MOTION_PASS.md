# RELAY interaction pass — 11 October 2026

This follows the earlier settings/billing pass. It changes the interaction system of the real workspace and the public pricing page. Existing repository work is preserved. No production data, billing configuration, VOVERE site or git history was changed.

## Interaction changes

- One delegated pressure controller starts on pointer down, responds more strongly to touch, and releases with a sampled damped spring. It continues from the currently rendered scale if another press interrupts it. The action itself is never delayed. Pointer cancellation, leaving the control, keyboard release, focus loss and window blur clear held state. Disabled/inert controls are excluded. Wide supplier/task rows compress substantially less than compact buttons.
- Pressure uses individual `scale`; outcome feedback uses `translate`; dialog movement uses `transform`. The channels compose without competing for the same transform. Removed conflicting old active transforms on the mobile navigation, refresh and website-menu controls.
- Add, upload, request and customize symbols stay anchored. Their internal geometry reacts with reversible CSS spring transitions. Request now depicts a document receiving information instead of the former tray. Sidebar symbols remain still.
- Success draws a rounded RELAY check gesture and settles the action. Error produces one short lateral recoil and a persistent coral state, with the explanation beside the original action. Labels retain their footprint and loading points run only during pending operations. No success shimmer or extra confirmation popup.
- Dialogs remember the actual pointer trigger, including Safari's buttons that don't automatically receive focus. Their transform origin and bounded travel follow the trigger; inspectors enter from the screen edge. Material and content travel together. Closing returns along the same direction. Keyboard openings use a short fade. Interrupted openings/closings reuse their current rendered frame.
- Select menus expand around their measured anchor with a damped spring. A quick reversal keeps the current geometry instead of restarting from a fully open menu. Escape dismisses the menu before the containing dialog.
- The supplier form reserves space for its usual validation message, preventing the button and modal from jumping on error. Long backend messages can still expand or scroll rather than being clipped.
- Customize switches use the shared spring for thumb travel and a small pressure stretch. The desktop inspector keeps the overview visible through a light scrim.
- Mobile navigation spacing is tighter while destinations remain at least 44 CSS pixels high. Toolbar search and notification hit areas measure 44 × 44 CSS pixels at 320 pixels wide. At this narrow width, the appearance shortcut lives in the navigation sheet; wider screens retain it on the toolbar.
- Pricing answers have a measured, interruptible height expansion and coordinated chevron movement. Native `details` semantics remain available without JavaScript; no hidden/inert content or static ARIA expansion override prevents the fallback. Monthly/yearly choices share the pressure controller and retain the existing moving selection capsule.

## Browser checks

Actual authenticated RELAY workspace, using the desktop app's in-app browser:

- At 1366 CSS pixels: opened the supplier form, submitted empty required fields, checked marked fields and persistent inline feedback. The action's top position measured **688.204 px both before and after the validation error**, with an unchanged 504 px width.
- At 390 CSS pixels: supplier form and validation message fit the viewport; no horizontal page overflow; form scroll lock and return focus work. Navigation destinations, including Settings, fit above the fixed footer after the spacing correction.
- At 320 CSS pixels: no horizontal page overflow; search/notification controls measure approximately **44 × 44 px**; appearance remains available in the navigation sheet; Customize has a scrollable body and visible Done footer.
- Public pricing at 320 CSS pixels: no horizontal overflow; yearly selection updates actual amounts and signup destinations. Opened answers, reversed them quickly, operated the summary by Enter and waited for the closed native details state. The collapsed row returned to its summary height with no leftover answer space.
- The existing dark preference was retained. Earlier light-mode component checks also ran in the isolated fixture.
- A fresh pricing tab opened and closed the new disclosure with an empty error console. The earlier development-only hook-dependency warning came from hot-replacing the component while its effect dependencies were being edited; it did not reproduce after a fresh page start.

Isolated component fixture, with the production Button, ActionButton, Dialog, Select and InteractionMotion components and no API calls:

- Held native mouse click for 300 ms. The actual minimum scale measured **0.975**; releasing removed the held-state attribute and returned toward full scale.
- One held click, keyboard Space and two rapid subsequent clicks produced exactly **four** activations. No stuck press or duplicate activation was observed.
- Required-field failure, typing to reset error, choosing an option, pending state and success state rendered correctly. Success uses the `signature-write` animation and the existing mint colour. This checks presentation, not database saving.
- ArrowDown opens the menu; Escape closes the menu while keeping its parent dialog open and focus on the select trigger.

The fixture is under `tests/fixtures`. Run `node node_modules/vite/bin/vite.js --config tests/fixtures/vite.config.mts` and open `http://127.0.0.1:5187/tests/fixtures/interaction-motion.html`. This test server has been stopped after QA. The production build does not contain fixture text or assets.

Screenshots: `interaction-error-desktop.png`, `interaction-error-mobile.png`.

## Validation and limits

TypeScript and production build passed. `git diff --check` passed. Browser reduced-motion preferences are respected by the implementation and CSS cascade was checked for overrides; OS preferences were not changed for testing. No physical iOS/Android matrix or production load test was performed. No company records, documents, emails or payments were created by these checks. Changes are local and unpushed.

## Official references studied

- [Apple WWDC — Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/): immediate response, continuous and interruptible movement, springs.
- [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): visible press feedback and understandable action hierarchy.
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): purposeful movement and directional continuity.
- [Apple HIG — Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback): confirmation in context and interruption proportional to importance.

These are web adaptations of the interaction principles. No native Apple Liquid Glass renderer or SF Symbols artwork was imported.

# RELAY interaction pass from official Apple references

Reviewed 9 October 2026. This document records a web implementation, not use of Apple's native rendering frameworks.

## References actually reviewed

- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion): brief, purposeful feedback; predictable arrival/departure; cancellable motion; restrained animation for frequent actions. Read the rendered article in the browser.
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): navigation and content have separate responsibilities; legibility and accessibility determine the material treatment. Read the rendered article and session transcript.
- [SF Symbols](https://developer.apple.com/sf-symbols/) and [Symbols framework](https://developer.apple.com/documentation/symbols): drawing choreography, discrete feedback and state continuity. Opened the installed SF Symbols app, searched checkmark, inspected its Regular geometry and Draw On controls, and invoked the preview. Further native-app inspection was stopped when the Mac became locked; no attempt to bypass the lock.
- [Apple's platform integration](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass): original Liquid Glass and Symbols animations belong to SwiftUI, UIKit and AppKit. Their native APIs are not HTML/CSS components. Apple's assets/fonts were not copied into the repository, and no web distribution rights are asserted from possession of the downloaded app. RELAY retains its own cross-platform SVG geometry and existing navigation icons.

## Implemented locally

| Interaction | Behavior |
| --- | --- |
| Supplier and Settings sections | One measured selection capsule moves and changes size with a damped 460 ms spring. Rapid selection reads the current capsule position and retargets it. Labels remain stationary. Resize observers update geometry without an animation loop. Arrow keys, Home and End work; dirty profile state remains visible. |
| Successful action | Preserved the approved mint. A more upright original check draws over 360 ms, coordinated with a short spring compression of the action surface. No enclosing badge or repeating celebration. |
| Failed action | Preserved coral. The exclamation glyph makes one damped angular refusal rather than shaking the full button sideways. Repeated failures restart it; the concrete inline message and retry action remain available. |
| Dialogs and mobile navigation | Spring arrival with the navigation origin tied to the initiating control. Departure reverses its direction. Interrupted animations preserve the current transform/opacity; keyboard and reduced-motion presentation remain immediate. |
| Frequent content changes | Compact panels update immediately with a small 240 ms arrival, removing the old exit wait and double parent/child choreography. |
| Selection menus | Arrival respects whether the menu is above or below its trigger. Pointer dismissal has a short 120 ms exit; exiting menus are inert. Keyboard dismissal remains immediate. |
| Material hierarchy | Translucent web material is confined to mobile navigation and selection menus; documents and form content remain opaque. Increased contrast/reduced transparency use opaque surfaces. No expensive continuously rendered refraction shader or glass-on-glass content cards. |

These materials do not reproduce Apple's native lensing, automatic environmental adaptation or framework implementation. Physical Safari/iOS, Android and Windows testing remains necessary before claiming identical platform behavior.

## Verification

- TypeScript and production client/server/Nitro build passed; final whitespace diff check passed.
- Real owner workspace: unchanged profile save returned Profile saved with a fully drawn check. A QA-only name draft survived Company/Profile changes and was discarded back to VOVERE Administrator, without saving that draft.
- Supplier sections and Settings: rapid clicks, arrow-key selection and responsive selection geometry checked. No supplier was created, changed or removed.
- At 390 px, native invalid submit retained dialog scroll position 0; repeating it advanced outcome run 3 → 6. At 320 × 568 px, Settings had no horizontal document overflow.
- Mobile navigation in Light/Dark: independent body scroll and pinned account footer; choosing a destination worked. Escape closed its nested company selector while preserving the navigation dialog. Original Light preference and default viewport restored.
- Warning/error log for the final fresh browser run was empty. Local screenshots remain in docs/qa/2026-10-09 and are not part of the application release.
- No pending exchange/avatar migration, email setting, permission, purchase or VOVERE site change was performed. This is an interaction pass, not a claim that all remaining RELAY product capabilities are complete.

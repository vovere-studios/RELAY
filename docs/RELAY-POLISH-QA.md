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

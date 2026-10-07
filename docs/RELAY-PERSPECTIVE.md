# Relay / Perspective

## Reference study — 7 October 2026

VOVERE was inspected through its live homepage and the read-only GitHub repository `vovere-studios/VOVERE-STUDIOS`. The study covered the automatic hero focus handoff, the particle material changing between BRAND / DIGITAL / SYSTEMS, the film collection overlay, fixed navigation, masked typography and the studio's native route transition.

Read source: `src/routes/index.tsx`, `hero-pressure-rewrite.tsx`, `vovere-cut.tsx`, `motion-collection.tsx`, `liquid-glass.tsx`, `use-signature-glyph-pointer.ts`, `use-hero-reveal.ts`, `use-editorial-reveal.ts`, `route-gravity-transition.tsx` and `motion.ts`. No VOVERE files, infrastructure or content were changed.

The useful principle is continuity: material, type, motion and narrative belong to one system. Relay translates that principle into supplier information rather than reproducing the studio's particles, brand assets or film collection.

## The authored idea

**Less chasing. More knowing.** Six pieces of evidence move from a scattered field into a connected supplier identity, then settle behind one clear profile. Visitors can scroll in either direction or select a chapter. The same document cards remain in the scene throughout the sequence; they are not replaced by unrelated illustrations.

The scene is illustrative, labelled as an example, and never claims live verification. Its central missing-information count explains a next step rather than inventing a compliance guarantee.

## Implementation

- `SignatureScene.tsx`: lazy GSAP/ScrollTrigger, sticky stage, reversible choreography, discrete chapter state, desktop pointer depth and responsive matchMedia contexts. Listeners and contexts are cleaned up on unmount and breakpoint changes.
- `Motion.tsx`: masked headings, route arrivals, short workspace panel transitions and longer marketing panel transitions. Rapid changes cancel stale exits.
- `AnimatedTabs.tsx`: measured active surface, ResizeObserver and native buttons with pressed state.
- `perspective.css`: neutral palette, heavy display typography, floating navigation, profile hierarchy, product presentation and responsive scene geometry. Reduced motion replaces the scroll journey with a static final identity.
- Native dialogs retain focus handling, Escape dismissal and constrained scrolling, with depth and staggered field arrival.

## Verification

Production build passes. Browser checks covered desktop and actual 390px CSS width; light/dark appearance; all three scene chapters; workflow selection; supplier Company/Documents tabs; editing-dialog opening and closing; mobile menu Escape handling; and horizontal overflow (zero at 390px). No browser errors appeared in the inspected sessions. During QA, the monogram selector was narrowed so it cannot enlarge the status badge, and scene geometry was adjusted to prevent the central identity from covering its caption.

These checks do not establish an award, a conversion improvement, or completion of the separately deferred production email setup.

## Opening product record

The hero now includes `ProductLens.tsx`, a keyboard-operable illustrative supplier record with Identity / Evidence / Perspective views and direct navigation to the corresponding demo profile. Compact transitions keep quick selections responsive. Checked all views, rapid switching, desktop composition and 390px layout with zero horizontal overflow.

## Original studio assets and type hierarchy

Imported the unchanged black/white SVG wordmarks and the OFL-licensed Vovere Expanded WOFF2 from the VOVERE-STUDIOS repository. The footer links to the studio and switches between the original SVG variants with the Relay theme. The display face is reserved for the marketing hero, perspective chapters and large closing statements. Product UI, metadata and numbers use the studio's native sans stack; numbers use tabular figures where aligned. Retained the font license and provenance in public/fonts. Browser checks verified loaded SVGs, computed font families, and no horizontal overflow at mobile and desktop widths.

## Product refinement — October 7

- Replaced the static marketing screenshot with ProductShowcase: Overview / Suppliers / Documents, persistent company selection, contextual documents, accurate example metrics, and links into the demo. Uses fixed example fixtures so local uploads never appear in the marketing preview.
- Added WorkspaceSearch, available by click or Cmd/Ctrl+K, with company/country/category filtering, arrow-key selection, Enter navigation, Escape dismissal, an empty state and accessible combobox/listbox semantics. The mobile trigger is also visible.
- Replaced instant native FAQ expansion with an accessible, always-mounted accordion; height, opacity and icon transitions run in both directions, with inert hidden answers and reduced-motion support.
- Refined product surfaces, type sizes and number alignment. Original VOVERE assets and Relay's monochrome identity remain intact.
- Toasts pause on hover/focus and animate out; timers clean up on unmount.
- Cloud account code now loads on demand. Focus, document titles and opening choreography live inside the same Suspense boundary as the loaded route. No authentication behavior or database settings changed.

Validation: production build; desktop and 390px layouts; showcase views and company selection; FAQ switching; search by country, ArrowDown/Enter opening the chosen supplier, empty state, Cmd+K, Escape and focus restoration; mobile search; dark-mode search contrast; toast triggered by re-saving unchanged organization details, remained visible after six seconds with keyboard focus, and dismissed correctly. Browser error log was empty in the checked flow. No real-account creation or email delivery was tested.

# RELAY deployment connection

Repository: https://github.com/vovere-studios/RELAY
Lovable editor: https://lovable.dev/projects/3db9f6f7-aa78-4186-9500-bfc78c9cc49d

The connected `main` branch supplies Lovable with the application code. Publishing the live website is a separate step in Lovable. The deployment shell uses the existing Lovable TanStack Start configuration and catches application paths so direct links to `/login`, `/cloud`, `/submit` and `/app` load the existing client application.

Application database, authentication and private storage use the external RELAY Supabase project `aadbcovypefhlpsmoinn`. Its browser publishable key is public by design; server secrets and local environment files are excluded from Git. No second application database is introduced. Email delivery and AI are not enabled by the code sync. See [VOVERE backend audit](docs/VOVERE-BACKEND-REFERENCE.md) and [connected workspace status](docs/RELAY-CONNECTED-WORKSPACE.md).

The owner account `admin@vovere-studios.com` and VOVERE Studios workspace exist in Supabase. The account still needs email confirmation; SMTP or a verified Auth email hook must be configured before treating passwordless access as ready. No owner password is stored in this repository.

---

# Relay

Relay is a local product foundation for structured supplier identities, buyer relationships and compliance documents. It is a separate project from VOVERE Studios, with the subtle attribution “A product of VOVERE”.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173.

```sh
npm run check   # strict TypeScript validation
npm run build   # typecheck and production bundle
npm run preview # inspect the production build
```

## iCloud workspace note

On this machine, dependencies are installed in `~/.cache/relay-local-runtime/node_modules` and the ignored local `node_modules` link points there. This avoids stalled file reads in iCloud. `node_modules.icloud-backup` is an ignored backup from the first install. Both are local environment details and must not be committed. On a fresh checkout outside iCloud, a normal `npm install` is sufficient.

## Current scope

- Responsive workspace shell and mobile navigation.
- Overview with derived network counts, attention items and activity.
- 24 example suppliers with searchable, sortable, filterable directory.
- Supplier detail: overview, company, products, documents, certificates, requirements and activity.
- English public product website, interactive workflow explanation, FAQ and local onboarding.
- Locally create suppliers, edit company/profile details and prepare information requests.
- Local PDF/PNG/JPEG uploads up to 10 MB, persisted in IndexedDB and downloadable from supplier profiles.
- Notification center with persisted read status, transient feedback, animated modal opening/closing and keyboard dismissal.
- Requests, documents, products and organization views.
- Light/dark mode with local preference persistence, reduced-motion support and accessible native dialogs.

Initial records are fictional demo data. Local edits and uploads are persisted in this browser. The reference date is **7 October 2026**, so expiry labels are deterministic. Example document verification is simulated. Uploaded files are unverified. The `/app` demo stays local. `/signup`, `/login` and `/cloud` now use real Supabase Auth and organization-scoped records. Cloud suppliers, private documents and request drafts are implemented. Email delivery, supplier invitations, supplier-owned shared profiles and AI extraction remain unimplemented; no request is emailed.

## Stack and structure

TanStack Start provides the Lovable deployment shell; the existing React Router application remains the client interface. React, strict TypeScript, Tailwind CSS v4 and Lucide icons. Tailwind is integrated through the Vite plugin. A compact CSS token system controls both themes, typography, layout and interactions. System fonts keep the app fast and independent of external font services.

```text
src/
  components/   Workspace shell, activity list and reusable UI primitives
  data/         Typed fixtures and pure selectors; no mock data in components
  domain/       Domain interfaces
  lib/          Replaceable product identity
  pages/        Overview, suppliers, supplier detail and secondary views
  App.tsx       Client-side route configuration
  main.tsx      React entry point
  styles.css    Design tokens, themes and responsive composition
public/         Original Relay favicon
```

UI primitives include Button, Input, Badge, Status, NavigationItem, PageHeader, SectionHeader, ListRow, EmptyState, Progress and Dialog. Native links and buttons support keyboard navigation. Dialog uses the browser's modal focus handling. Directory rows become structured lists on smaller screens.

## Domain model

- **Organization** represents a legal company; **User** belongs to an organization and has a workspace role.
- **Supplier** represents a reusable company identity linked to its organization.
- **SupplierRelationship** connects a buyer organization to a supplier. Completeness, buyer-specific status and missing counts belong here, rather than on the shared identity.
- **Product** belongs to a supplier and carries a material and supplier reference.
- **Document** stores metadata and reserves a nullable storage path; no binary data lives in the model.
- **Certificate** references its source document and adds issuer, standard and validity dates.
- **Requirement** belongs to a relationship, with an optional document fulfilling it.
- **DataRequest** groups requirements for that relationship and tracks dates/status.
- **Activity** records a supplier event with an optional actor and timestamp.

IDs are strings, dates are ISO strings, and state values are discriminated unions. These are domain types, not a prematurely fixed database schema. The migrations in `supabase/migrations` establish UUID foreign keys, tenant constraints, membership roles and row-level security. Completeness should eventually be calculated from configured requirements; fixture percentages are illustrative today. Do not trust client-side completeness or verification as an authorization boundary.

## Visual decisions

A neutral paper canvas and graphite follow the read-only VOVERE reference. A strong typographic opening, compact floating workspace shell and interactive 24-connection network portrait establish Relay’s product interface. The portrait is connected to supplier data and supports keyboard selection and live announcements. Semantic colors signal completeness or expiry only. All styles and branding are independent; no VOVERE source or assets were imported, and its repository was not modified.

## Next implementation

Build the first complete buyer-to-supplier workflow: organization setup, authenticated memberships, supplier invitations, supplier-owned profile editing and secure document upload. Supabase/PostgreSQL with organization-scoped RLS and private Storage policies is configured. Then implement requirement-based completeness and expiry reminders. Document extraction should follow reliable storage and review, rather than define the product.

## GitHub and Lovable

This delivery is local. Connect **a dedicated Relay repository** when ready; never use the VOVERE remote. Commit this project including package-lock.json, excluding node_modules, dist and secrets. The standard Vite scripts make the code portable for a later GitHub/Lovable workflow. Production hosting must rewrite application routes (such as /app/suppliers/supplier-1) to index.html. No hosting deployment or remote repository has been created in this delivery.

## Routes and local persistence

`/` is the English sales website; `/signup` and `/login` use Supabase Auth; `/account` receives confirmation redirects; `/cloud` is the connected workspace; `/preview-setup` creates a local profile; `/app` is the local demo. Workspace records use `relay-local-workspace-v1` in localStorage; file bytes use IndexedDB `relay-local-files`. Clearing site data removes local records and uploads. Uploaded metadata and files are separate; browser storage can fail or be evicted, so this preview is not a backup or a production document vault.

The iCloud workspace uses polling in Vite to reduce filesystem-event restarts. No external analytics or remote fonts are used. The connected routes call Supabase. A production release still needs email delivery, confirmed Auth redirect URLs, supplier access, real verification, privacy/legal content and hosting configuration.

## Supabase connection — 7 October 2026

Project `aadbcovypefhlpsmoinn` is active in the separate RELAY organization (Free, eu-west-1). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment; `.env.local` is ignored. Never place service-role or secret keys in the frontend.

Three remote migrations match the local core, security/index and workflow SQL. TypeScript types are generated in `src/lib/database.types.ts`. Storage bucket `relay-documents` is private and accepts PDF/PNG/JPEG up to 10 MB. Owner/admin writes and company-scoped reads are enforced in Postgres and Storage. Owners are recognized directly through organizations.owner_id; membership rows cannot be self-granted.

Verification: production build passed; Supabase security advisor returned no notices. A rolled-back transaction asserted tenant read isolation, foreign-company insert denial, default supplier requirements, request requirement links and idempotent workspace creation. No test users or tenants remain. Anonymous table access, TRUNCATE and owner-column updates were denied in the previous privilege check.

Remaining setup: custom SMTP/email provider intentionally deferred by the user. Configure Auth Site URL and exact `/account` redirect URLs for localhost and the eventual Lovable domain before testing confirmation delivery. The dashboard URL configuration page currently renders blank, so those settings are not confirmed. Supplier emails remain drafts. Authenticated upload/download still needs end-to-end testing with a confirmed real account. A failed document metadata insert after an upload can leave an orphaned storage object; the UI reports the failure.

VOVERE was inspected read-only: its current GitHub implementation sends transactional and auth emails using `@lovable.dev/email-js`, `noreply@vovere-studios.com`, and sending domain `notify.vovere-studios.com`. This confirms code configuration, not live delivery. Relay can later use a separate subdomain of the existing domain; no DNS or VOVERE settings have been changed.

## Motion system

`src/components/Motion.tsx` shares a settle curve across masked word reveals, route arrivals, observed sections and interruptible product panels. The product stage has a bounded perspective adjustment during native scrolling. Workflow descriptions expand smoothly; the preview exits for 140 ms before staging its next state. Native dialogs enter with depth and staggered content; exits stay short. Buttons provide directional hover and press feedback. Reduced-motion skips the JavaScript choreography and disables positional CSS transitions. All observers, animation handles and scroll listeners are cleaned up on route changes.

Read-only VOVERE references: motion.ts, use-hero-reveal.ts, use-editorial-reveal.ts and route-gravity-transition.tsx. Relay uses its own components and does not alter VOVERE. Checked narrow and desktop layouts, product-step switching, dialog focus/closing and browser errors.

## Perspective redesign

The public website and supplier profiles now share a neutral, heavier editorial direction. The central product story is an original, reversible GSAP scene in `SignatureScene.tsx`: the same evidence cards move from scattered documents into one supplier identity. GSAP and ScrollTrigger are loaded lazily. `AnimatedTabs.tsx` provides a measured selection surface; profile content uses shorter panel transitions. Public mobile navigation supports animated opening, Escape and outside-click dismissal. Styling lives in `src/styles/perspective.css`. The reference study and verification are documented in `docs/RELAY-PERSPECTIVE.md`.

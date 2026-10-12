# RELAY: Paddle account and activation

Updated 11 October 2026. Direct Paddle integration; application accounts, documents and the billing state remain in the existing external RELAY Supabase project. Paddle stores the customer, subscription and payment information it needs as payment provider. Lovable hosts the app and its server endpoints.

## What the operator must do

1. Create a [Paddle account](https://login.paddle.com/) for the actual operator. For the confirmed sole trader, use **Maximilian Felix Christian Riedl**, with VOVERE Studios / RELAY as the product brand. Use the confirmed business address and a company email such as `admin@vovere-studios.com`. Do not describe the operator as a GmbH. A separate company or bank account is not automatically needed just to create the software project; the actual registration, trade scope and tax treatment must be clarified with WKO/accountant before commercial operation.
2. Create a separate [Paddle sandbox account](https://sandbox-login.paddle.com/). Testing in sandbox does not need domain approval and does not process real payments. You must personally accept the provider terms and complete any identity, business and bank verification. Do not send identification, bank details or API keys in chat.
3. In the sandbox, create an API key with `customer.read`, `customer.write`, `transaction.read`, `transaction.write`, `subscription.read` and `customer_portal_session.write`. Product/price creation additionally requires `product.read`, `product.write`, `price.read`, `price.write`; these write permissions can be removed after catalog setup. Create a sandbox **client-side token** separately; it is not the API key.
4. Put the API key and client-side token into the RELAY **Lovable server secret manager**, using `PADDLE_API_KEY` and `PADDLE_CLIENT_TOKEN`. Tell the coding agent that the sandbox account is ready. Do not paste the key into a chat, GitHub or a `VITE_` variable. These credentials are for Paddle and do not replace the Supabase auth email-hook signing secret.
5. Before live payments, finish Paddle's business, identity, payout and domain review, submit **relay.vovere-studios.com**, and approve the final RELAY legal/refund texts. Clarify the scope of the existing Werbeagentur trade with WKO. There is currently no live-payment activation.

## Implementation now present

- Public `/pricing`: three company plans, monthly/yearly selector and clear tax/activation information. Header/footer contain Pricing.
- Real `/cloud?view=settings&section=Billing`: authorized plan, actual document/storage/member/supplier counts, proposed allowances and selected plan review. `/app` remains the separate demo.
- Pricing selection survives sign-in and account creation, while invitations and supplier responses keep priority. Redirects are restricted to known local billing routes.
- `/api/billing/workspace`: server-verified Auth identity, current owner/admin membership in the database, same-origin POST, bounded body, no-store responses. Checkout, resume and a fresh company-scoped billing portal session.
- `/pay`: Paddle's default payment link route. An authenticated company administrator resumes a previously recorded transaction; arbitrary transaction IDs cannot authorize a purchase for another company.
- One provider customer per workspace/environment. Existing customers are never attached by email alone; use a separate company billing email if the same email already belongs to another Paddle company customer. Temporary portal URLs are never persisted.
- Checkout attempts recorded before provider calls. Duplicate taps reuse a known ready transaction. Ambiguous external failures are marked uncertain and block new payable orders until reconciled.
- `/api/billing/webhook`: unchanged body signature verification, current subscription retrieval, original completed transaction validation, exact server-known price/currency/cycle/quantity, transaction/customer/company binding and database event deduplication. Client checkout success does not grant a plan. Provider `updated_at` prevents older events from replacing newer state.
- Separate sandbox and production records. Scheduled cancellation preserves the plan until Paddle actually marks the subscription canceled. Cancellation/pausing never delete company data.
- Private Supabase billing tables with RLS, no client table grants and service-only writes. The sanitized read RPC is authenticated and checks company membership.
- `scripts/paddle-catalog.mjs` prepares the sandbox catalog with two SaaS products and four EUR recurring prices. It reuses matching resources, checks amounts and never edits an existing price or performs live writes. Not run against Paddle yet.

## Server configuration

| Variable | Value/source |
| --- | --- |
| `PADDLE_ENVIRONMENT` | `sandbox` for testing; later `production` with a separate catalog |
| `RELAY_PADDLE_SANDBOX_ENABLED` | `true` only after a complete sandbox setup |
| `PADDLE_API_KEY` | API key for the selected environment |
| `PADDLE_CLIENT_TOKEN` | Client-side token for that same environment; served only when opening checkout |
| `PADDLE_WEBHOOK_SECRET` | Signing secret from the notification destination below |
| `PADDLE_CORE_MONTHLY_PRICE_ID` | EUR 29/month, exclusive tax, quantity exactly 1 |
| `PADDLE_CORE_ANNUAL_PRICE_ID` | EUR 290/year, exclusive tax, quantity exactly 1 |
| `PADDLE_PRO_MONTHLY_PRICE_ID` | EUR 79/month, exclusive tax, quantity exactly 1 |
| `PADDLE_PRO_ANNUAL_PRICE_ID` | EUR 790/year, exclusive tax, quantity exactly 1 |
| `RELAY_SUPABASE_SECRET_KEY` | Existing RELAY server-only key for private billing RPCs; never expose to the client |
| `RELAY_PADDLE_LIVE_ENABLED` | **false** until production release |
| `RELAY_BILLING_LAUNCH_APPROVED` | **false** until the launch conditions below are completed |
| `RELAY_BILLING_TERMS_VERSION` | Version of the final published business terms; currently unset |

Use `tax_category: saas`, `tax_mode: external`, currency EUR, billing frequency 1, quantity min/max 1 and no trial for the initial catalog. Do not add cheaper price overrides or unexpected discounts without updating/reviewing the price validation.

Default payment link: `https://relay.vovere-studios.com/pay`.

Notification destination: `https://relay.vovere-studios.com/api/billing/webhook`. Subscribe to `transaction.completed`, `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled` and `subscription.trialing`. Save that destination's signing secret as `PADDLE_WEBHOOK_SECRET` in the server environment, then publish the connected build.

## Before live activation

- Configure the separate live catalog, key, token and notification destination after Paddle approves the actual operator and domain. Sandbox IDs never work in production.
- Complete actual sandbox tests: checkout, renewal, payment failure, cancellation, duplicate/stale notifications, receipts/invoices and a second company. Mocked tests are not actual provider delivery or payment tests.
- Publish final `/terms`, `/privacy` and `/refunds` pages plus the RELAY operator imprint and DPA. Current legal texts are internal drafts. Checkout links to those pages are not exposed while production is disabled.
- Implement and test server-enforced allowances across authenticated and guest uploads, seat invitations/acceptance, supplier creation/restoration and document restoration. The current `quota_enforced:false` state is deliberately explicit; the displayed allowances are planned limits, not active hard limits. Existing beta files are not deleted or hidden when those limits are reached.
- Add automatic reconciliation for uncertain checkout attempts, operational monitoring and plan-change previews/confirmation. Initial integration supports first purchase and the Paddle portal for invoices, payment methods and cancellation. It does not claim arbitrary plan switching is already complete. Paddle's portal upgrade/downgrade feature is **early access**, so its availability must not be assumed.
- Finalize past-due grace period, retention after cancellation and refund policy. Test safe read/download/export access after a downgrade.
- Estimate hosting/email/compute costs and explicitly approve any paid Supabase upgrade; none has been activated in this work.

## Verification

- `npm run check`, `npm run build`.
- `node tests/paddle-sandbox.mjs`: raw signatures, clock window, body limits, configuration/price/customer/portal guards; no external requests.
- `node tests/paddle-billing-worker.mjs`: compiled Cloudflare worker with all network requests mocked; origin/Auth gates, B2B confirmation, company customer/checkout, duplicate order reuse, portal/resume, original completed order binding, exact EUR prices, sanitized errors and pricing SSR.
- `supabase/tests/company_billing.sql`: database tests run in a rolled-back transaction; owner/admin/member/outsider isolation, usage, duplicate checkout/event protection, stale provider versions, unique company customers, sandbox separation, cancellation. No actual subscription is created by these tests.

References: [domain and legal review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification), [identity verification](https://www.paddle.com/help/start/account-verification/what-is-identity-verification), [API permissions](https://developer.paddle.com/api-reference/about/permissions/), [Paddle.js](https://developer.paddle.com/paddle-js/), [products](https://developer.paddle.com/api-reference/products/create-product/), [prices](https://developer.paddle.com/api-reference/prices/create-price/), [signature verification](https://developer.paddle.com/webhooks/about/signature-verification/), [portal sessions](https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/), [portal plan changes in early access](https://developer.paddle.com/build/subscriptions/customer-portal-upgrades-downgrades/).

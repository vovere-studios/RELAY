# RELAY initial pricing recommendation

11 October 2026. Launch proposal, not a validated willingness-to-pay study. One plan per company workspace. Individual employees are seats within that plan; 100 registered people are not necessarily 100 paying companies.

| Plan | Monthly | Yearly | Active documents | Stored files, including trash | Team members | Suppliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Free | EUR 0 | EUR 0 | 20 | 50 MB | 1 | 5 |
| Core | EUR 29 | EUR 290 | 500 | 1 GB | 5 | 50 |
| Pro | EUR 79 | EUR 790 | 5,000 | 10 GB | 15 | 250 |

All prices exclude VAT. Annual billing gives two months compared with twelve monthly payments: **16.7%**, not 20%. Annual equivalent is EUR 24.17/month for Core and EUR 65.83/month for Pro, with the full yearly sum billed at once. Actual total/tax must be clear before payment.

## Why these three

Free helps suppliers adopt Relay and lets a company complete a real workflow without a card. Core is the primary offer for an operational team, with a meaningful allowance increase. Pro is for companies with a larger supplier network and more colleagues. Avoid many small tiers and extra per-seat fees at launch. Do not claim Core is the best-selling plan without sales data.

The value is saved coordination and reuse of company evidence, not cheap disk space. Basic document review, private sharing, guest uploads and data access belong in every plan. Do not paywall basic security or access to existing data. Suppliers responding to a request should not have to subscribe. Sharing a stored document reference should not charge storage to the recipient a second time.

These first plans do **not** include AI verification. Evaluate cost per page/model call and an accuracy/appeal workflow before selling an AI allowance. Avoid unlimited AI. Do not advertise automated expiry emails or functions that are not yet activated.

The UI and billing state are implemented. Hard quotas are not yet enabled; the workspace labels beta allowances as planned. A paid release still needs quota enforcement and the external Paddle tests described in RELAY_PADDLE_SETUP.md.

## Storage and infrastructure

[Supabase pricing](https://supabase.com/pricing) checked 11 October 2026: Free includes 1 GB file storage; the database limit is 500 MB per project. Uploaded PDFs/images consume file storage, not an equivalent PDF-sized database row. Pro starts at USD 25/month and includes 100 GB file storage, 8 GB database disk per project and 250 GB uncached egress. Compute, extra projects, cached egress, optional services and limits have their own rules.

Illustration: 100 company workspaces × 20 files × average 2 MB = **4 GB**, before trash and abandoned upload objects. That exceeds the free file-storage allowance. 100 companies using the full 50 MB Free allowance would require 5 GB. A free customer plan does not mean zero operating costs. No paid infrastructure has been enabled.

Storage overage on Supabase Pro is USD 0.0213/GB/month and uncached egress overage is USD 0.09/GB. Storage alone is unlikely to justify the subscription price; staff support, acquisition, email, database compute, backups/retention, outages and future AI must fit the margin too. Do not promise unlimited storage or zero variable cost.

Original files count once in the owning workspace. Trash and abandoned physical uploads still use bytes. Count and byte caps both apply in the planned model; the first one reached triggers an upgrade prompt for additional uploads, while existing data remains accessible. Before activation, define migration treatment for beta workspaces already over a limit.

## Revenue examples, not profit promises

[Paddle standard pricing](https://www.paddle.com/pricing) is 5% plus **USD 0.50** per checkout transaction, without a standard monthly platform charge. The fixed fee is not EUR 0.50. Actual fees depend on billed tax, currency conversion, refunds/chargebacks, payment terms and any provider-specific contract.

For an illustrative zero-tax transaction, Core leaves EUR 27.55 minus USD 0.50 before infrastructure and all other costs; Pro leaves EUR 75.05 minus USD 0.50. This deliberately avoids inventing a current EUR/USD exchange rate or treating these figures as profit.

| Illustrative customer mix | Monthly recurring revenue before fees/tax |
| --- | ---: |
| 100 companies, all Free | EUR 0 |
| 85 Free, 12 Core, 3 Pro | EUR 585 |
| 70 Free, 20 Core, 10 Pro | EUR 1,370 |

At 100 companies with 20% Core and 10% Pro conversion, revenue is EUR 1,370; **30 pay**, not 100. Those conversions are scenarios, not forecasts. Annual payments require spreading revenue across the service period in the operating model; cash received up front is not all immediate earned profit.

## Validate the price

Start with these prices, then interview 10–15 procurement/operations/compliance teams. Measure whether users finish the first request, reuse documents, invite teammates and return; measure conversion, cancellation, support hours and actual cost per workspace. Assess the price against the coordination time saved. Do not reduce prices solely because storage is cheap. Use yearly savings rather than perpetual launch discounts. Add an enterprise/custom tier only when larger customers have concrete needs the product can actually meet.

Paddle manages payment/sales-tax responsibilities as merchant of record under its contract. It does not register the operator's trade, remove income-tax/bookkeeping duties or automatically finalize RELAY's privacy, processor and customer-contract obligations.

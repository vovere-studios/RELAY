# RELAY legal package — internal review draft

Draft dated 11 October 2026. Not published, not accepted by customers and not a statement that RELAY is ready for paid operation. Bracketed items require factual completion. Contract, retention and refund proposals below require operator approval and legal review before publication. English is the proposed public language; keep a reviewed German version if offered to German-speaking customers.

Confirmed scope: business use only; company workspaces, employees, supplier records, private documents, requirements and selected document exchange. No live payment integration or enforced paid quotas exists. AI authentication/fraud certification is not an existing service.

## 1. Legal notice: factual template

RELAY is a software product operated by **[confirmed legal operator]**, trading as **[business name]**.

Public VOVERE data confirmed as accurate by the user: Maximilian Felix Christian Riedl; VOVERE Studios; Römerweg 3, Top 1, 6143 Matrei am Brenner, Austria; GISA 39733351; currently Werbeagentur. Source: [existing VOVERE notice](https://vovere-studios.com/impressum). The user prefers a free project phase before commercial operation; its trade-law classification and the final operator model require clarification. Do not state that RELAY is a separate incorporated company or that an IT trade license already exists.

Contact: **[approved RELAY support/legal email and additional required contact details]**. VAT identification: **[UID if applicable]**. Relevant authority, chamber membership, professional rules and register entries: **[confirm for the actual RELAY activity]**.

The software operator and the checkout's Merchant of Record must be identified distinctly if Paddle is selected. Do not label Paddle the operator of the RELAY application.

## 2. B2B terms: proposed public text for review

### Business customers and authorized users

Relay is offered exclusively to businesses for business purposes. The customer is the company identified in its workspace and order, acting through an authorized representative. Employees use the service under the company's permissions; an employee account is not a separate company subscription. You must provide accurate company and contact information and keep account access secure. You may invite only people you are authorized to give access to your workspace.

### Service and customer documents

Relay organizes supplier information, company documents and requirements. It allows customers to request, upload, review and share documents with selected business partners. A document marked reviewed or complete reflects a workspace review or requirement state. Relay does not independently certify the authenticity, legal sufficiency or regulatory compliance of a document.

You retain your rights to your content. You grant the operator permission to process it only as necessary to provide the service, follow your instructions and meet applicable obligations. You are responsible for your authority to upload and share content and for the accuracy of the business information you supply. Do not upload unlawful content or content you are not entitled to disclose.

### Sharing and upload links

Sharing selected documents makes them available to the chosen recipient company. Anyone holding an active guest upload link can use its permitted submission functions. Keep private links confidential and revoke them when no longer needed. Guest submitters can respond without creating a Relay account. Review the destination company and selected documents before submitting.

Removing a received reference from your workspace does not erase another company's original document. Rejecting a document records the review outcome and reason; it does not establish that the document is fraudulent. Moving an item to Trash is recoverable and retains the file; it is not permanent deletion or automatic storage reclamation. **[Describe actual revocation, reference retention, guest link expiry and permanent-delete behavior after operational verification.]**

### Subscription, payment and renewal

**[Publish only after billing exists.]** Your order states the workspace plan, currency, applicable taxes, billing period, price and limits before you purchase. One subscription applies to one company workspace. Additional workspace subscriptions require separate orders. The paid period starts **[actual provider/activation rule]** and renews **[approved renewal rule]** unless canceled in time.

If Paddle is selected, identify Paddle's applicable contracting entity and applicable checkout terms from the verified provider setup. Paddle handles the purchase as Merchant of Record; Relay supplies the application. If standard Stripe is selected, identify the RELAY operator as seller and explain Stripe's payment-processing role. Do not mix these models in a published contract.

### Cancellation, downgrade and refunds

Proposed product policy: customers may cancel renewal through Settings → Billing or the linked customer portal; access to paid features continues until the end of the paid period. Explain the exact effective date before confirmation. A downgrade must not automatically delete existing documents. **[Confirm the read/export period, quota behavior and eventual closure/deletion schedule before offering this policy.]**

There is no consumer distance-selling withdrawal entitlement for genuine business-to-business contracts. This does not exclude statutory remedies or contractual rights otherwise applicable. Refund requests can be sent to **[contact]** or the purchase provider. **[Approve the actual refund policy, treatment of outages, duplicate billing, provider requirements and any voluntary guarantee.]** Do not publish an absolute “no refunds under any circumstances” clause.

### Availability, changes and termination

The operator maintains and updates the service. **[Set realistic support availability and maintenance communication; no unmeasured uptime guarantee.]** Material changes to an existing paid contract require a defined notice and customer remedy. Restriction for abuse or security incidents should be proportionate and explained where feasible. Termination must include a clear opportunity for authorized customers to retrieve their data, subject to lawful restrictions.

### Responsibility, applicable law and disputes

**[Legal review required: balanced B2B warranty and liability clauses, mandatory exceptions, Austrian governing law and enforceable forum for the confirmed operator and customers.]** Do not copy a consumer exclusion, unlimited liability waiver or fictitious jurisdiction from another business.

### Contract record

The accepted terms version, company, representative and timestamp must be recorded. The customer receives or can download a durable copy of the order and applicable terms. **[Implement this before checkout goes live.]**

## 3. Privacy notice: factual processing register and proposed wording

### Who processes your information

**[Confirmed operator and contact]** is responsible for the personal information it processes for account administration, service security, business communications and its own billing obligations. When a business customer supplies documents containing personal information for its own purposes, the operator generally processes that content on the customer's instructions under a separate data processing agreement. The relevant business customer is then the contact for questions about that document processing.

### Information and purposes

| Processing | Information | Purpose / basis to verify |
| --- | --- | --- |
| Account and workspace administration | Name, business email, company details, membership and permissions | Contract where the person is the contracting party; legitimate business interests for employee administration as applicable |
| Customer-controlled documents and requests | Files, supplier contacts, requirements, submission details, chosen recipients and review outcomes | Customer instructions and its lawful basis; Art. 28 agreement |
| Service security and audit | Authentication/session records, relevant activity and technical logs | Legitimate interests in protecting the service; required retention limited to purpose |
| Transactional communication | Recipient, message content and delivery records | Account/service operation; no bundled marketing consent |
| Future billing | Company billing contact/address, order, provider identifiers, tax and payment status | Contract and applicable accounting/tax duties, once enabled |
| Support | Correspondence provided by the requester | Responding to and resolving the request |

Information supplied by a guest is made available to the company requesting it. Show that company and this notice before submission. The optional account offer is separate from sending documents.

### Recipients and service providers

Current implementation uses the external RELAY Supabase project for authentication, database and private file storage, and Lovable for application hosting and transactional email delivery. Delivery involves necessary recipients and message content; it is not accurate to say that no data ever leaves Supabase. Existing code forwards runtime errors to Lovable hooks when those hooks are available; actual production/preview telemetry must be audited before finalizing the notice.

**[Verify contracted provider legal entities, DPAs, subprocessor lists, project region, mail routing, support access and international-transfer safeguards.]** Do not state “EU only” or “no tracking” without verifying the deployed behavior. Add Paddle or Stripe after selection and distinguish independent-controller billing functions from processing on behalf of Relay.

### Browser storage and consent

The application uses browser storage for authentication and preferences, including appearance, and the separate demo persists example data locally. **[Inventory actual keys, purposes and expiry in production.]** Optional marketing or analytics tools need their own assessment and, where required, consent before loading. A generic cookie banner does not replace that inventory, and necessary sign-in storage must not be described as optional advertising tracking.

### Retention and deletion

**[Approve and implement separate periods for active files, Trash, abandoned guest submissions, revoked sharing references, audit/security logs, authentication records, delivery logs, support and legally retained billing records.]** Explain the backup expiry interval and handling of restore operations. Current Trash retains documents indefinitely until a separately implemented and verified permanent-deletion flow changes that behavior. Do not promise automatic deletion after 30 days.

After contract closure, return or delete customer-controlled personal data as instructed, subject to applicable legal retention and the agreed backup schedule. State the actual export method and deadline. Disabling a paid plan is not the same as deleting an account or all document copies.

### Rights and complaints

Where applicable, you may request access, correction, erasure, restriction and portability, and object to processing based on legitimate interests. Consent can be withdrawn for future processing where consent is used. Contact **[confirmed privacy contact]**. For customer-controlled documents, contact the requesting/customer company; Relay assists that company under the processing agreement. You may complain to the competent supervisory authority, including the Austrian Datenschutzbehörde. Explain required information, whether it is contractual/legal, and the consequences of not supplying it.

No AI fraud detection or consequential automated decision-making is currently advertised as active. A future AI service needs a fresh processing assessment, actual vendor disclosure, purpose limits and human review rules before activation.

## 4. Data processing agreement: review-ready annex structure

The business customer is controller for the personal data it places in Relay for its business purposes. **[Operator]** is processor for that processing. The agreement must cover:

1. Subject and duration: workspace document/information management and directed exchange for the contract term, followed by the confirmed return/deletion schedule.
2. Nature and purposes: receiving, storing, displaying, organizing, reviewing and transmitting selected information on documented customer instructions.
3. Data and persons: business contacts, employees, supplier representatives and other persons appearing in customer documents. Describe whether sensitive categories are prohibited or permitted under agreed conditions.
4. Instructions, confidentiality, appropriate security measures and access by authorized personnel.
5. Assistance with rights requests, security incidents, impact assessments and applicable regulatory duties. Define the incident contact and notice procedure without inventing an unimplemented response-time guarantee.
6. Subprocessors: verified Supabase/Lovable entities, tasks, locations, agreements and change/objection mechanism; approved future providers only after assessment.
7. International transfers and the applicable safeguards after verifying actual hosting and support arrangements.
8. Data return, deletion, backups and exceptions required by law.
9. Information and proportionate audits needed to demonstrate compliance, with operationally feasible conditions.

TOM annex must distinguish implemented controls from goals. Candidate implemented controls to validate: authenticated company membership, RLS/permission checks, private storage, limited signed access, explicit selected sharing, authenticated server operations and signed mail hooks. Validate session handling, staff access, secrets, upload limits, malware controls, monitoring, backup availability and restore procedure before claiming them. Free-provider backup availability must not be represented as a paid production backup service.

## Publication gates

Confirm operator and contact details; clarify the trade-license scope; select and verify the payment provider; approve subscription/cancellation/refund and retention policies; inspect actual data processing; complete and review the DPA and TOM; add real public legal routes/footer links; add versioned acceptance and durable contract records; verify the complete production flow. These drafts are source material for that work, not substitutes for unresolved operational facts.

Legal background checked: [USP Gewerbeanmeldung](https://www.usp.gv.at/gruendung/EAP/gewerbeanmeldung.html), [WKO B2B/B2C distinction](https://www.wko.at/internetrecht/ruecktrittsrecht-bei-dienstleistungen-im-internet), [WKO controller/processor roles](https://www.wko.at/dsgvo4kmu/verantwortlicher-auftragsverarbeiter). The product-specific wording is a draft inferred from the current code and confirmed business scope.

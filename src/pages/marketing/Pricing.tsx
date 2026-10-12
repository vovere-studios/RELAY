import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './Website';
import { SegmentedControl } from '../../components/SegmentedControl';
import { PlanCards } from '../../components/PlanCards';
import { Disclosure } from '../../components/Disclosure';
import type { BillingCycle } from '../../lib/billing/plans';

export function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>('month');
  return <div className="public-site"><a className="skip-link" href="#main">Skip to content</a><PublicHeader/>
    <main id="main" tabIndex={-1} className="public-main pricing-main">
      <section className="pricing-intro"><span className="eyebrow">SPACE FOR YOUR NEXT STEP</span><h1>A clearer network.<br/>A plan that fits.</h1><p>Start with your company. Grow with your team.<br/>One plan per workspace, with the essentials in every plan.</p></section>
      <div className="pricing-toolbar"><SegmentedControl className="billing-cycle" label="Billing frequency" value={cycle} options={[{ value:'month', label:'Monthly' },{ value:'year', label:'Yearly · save 16.7%' }]} onChange={value=>setCycle(value as BillingCycle)}/><p>Prices in EUR, excluding VAT. Business use only.</p></div>
      <PlanCards cycle={cycle}/>
      <p className="pricing-release-note">Paid plans are being prepared. You can create your workspace now; no subscription or payment is started by choosing a plan.</p>
      <section className="pricing-included"><div><span className="eyebrow">THE SAME FOUNDATION</span><h2>Good information.<br/>At every level.</h2></div><ul><li>Your company’s document library</li><li>Supplier profiles and requirements</li><li>Private upload links for guests</li><li>Selected document sharing between companies</li><li>Document review, rejection and recoverable trash</li><li>Light, dark and system appearance</li></ul></section>
      <section className="pricing-questions"><h2>A few things, answered.</h2><div>
        <Disclosure title="Does every team member need a subscription?"><p>No. The plan belongs to your company workspace. Core includes five team members, Pro includes fifteen, and Free is for one person.</p></Disclosure>
        <Disclosure title="Do our suppliers have to pay to send documents?"><p>No. A supplier can respond through your private upload link without creating a Relay account. Companies already using Relay can select documents from their own library.</p></Disclosure>
        <Disclosure title="How do document and storage limits work?"><p>A plan includes both an active document allowance and a file storage allowance. Documents in the trash still occupy storage. Sharing a reference to a document does not create another stored copy in the receiving workspace.</p></Disclosure>
        <Disclosure title="Is AI document checking included?"><p>No. AI verification is being considered for a later release. These plans cover the document and supplier workflows available today.</p></Disclosure>
        <Disclosure title="What happens if we cancel?"><p>The intended policy is access to your paid plan until the end of its billing period. Your company information will not be automatically deleted when a subscription ends. Final billing terms will be published before paid plans open.</p></Disclosure>
      </div></section><div className="pricing-last-step"><p>See how a clearer workspace feels.</p><Link className="text-link" to="/app">Explore the demo ↗</Link></div>
    </main><PublicFooter/></div>;
}

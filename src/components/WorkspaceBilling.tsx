import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { reducedMotion } from '../lib/motion';
import { settle } from './Motion';
import { Link } from 'react-router-dom';
import { PlanCards } from './PlanCards';
import { SegmentedControl } from './SegmentedControl';
import { ActionButton, OutcomeMark, useActionFeedback } from './ActionFeedback';
import { Button, Input, LoadingIndicator } from './ui';
import { RefreshControl } from './RefreshControl';
import { FieldLabel } from './FieldLabel';
import { billingRequest, openBillingCheckout, type BillingSnapshot } from '../lib/billing/client';
import { planById, formatBytes, isPaidPlan, isBillingCycle, type BillingCycle, type PaidPlan } from '../lib/billing/plans';

export function WorkspaceBilling({ organizationId, companyName, email, initialPlan, initialCycle }: {
 organizationId: string; companyName: string; email: string; initialPlan?: string | null; initialCycle?: string | null;
}) {
 const [snapshot,setSnapshot] = useState<BillingSnapshot | null>(null);
 const [cycle,setCycle] = useState<BillingCycle>(isBillingCycle(initialCycle)?initialCycle:'month');
 const [selected,setSelected] = useState<PaidPlan | null>(isPaidPlan(initialPlan)?initialPlan:null);
 const [error,setError] = useState(''), [loading,setLoading] = useState(true), [waiting,setWaiting] = useState(false);
 const [confirmationDelayed,setConfirmationDelayed] = useState(false);
 const feedback = useActionFeedback();
 const order = useRef<HTMLElement>(null); const controller = useRef<AbortController | null>(null); const alive = useRef(true);
 const load = useCallback(async()=>{
   controller.current?.abort(); const request=new AbortController(); controller.current=request;
   setLoading(true);
   try { const next=await billingRequest<BillingSnapshot>({action:'status',organization_id:organizationId},request.signal); if(!request.signal.aborted){setSnapshot(next);setError('');} }
   catch(error){if(!request.signal.aborted)setError(error instanceof Error?error.message:'Billing is temporarily unavailable.');}
   finally{if(!request.signal.aborted)setLoading(false);}
 },[organizationId]);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;controller.current?.abort();};},[load]);
 useEffect(()=>{
   if(!waiting)return;
   let active=true; let timer:ReturnType<typeof setTimeout>;
   const request=new AbortController();
   const poll=async()=>{
     try {const next=await billingRequest<BillingSnapshot>({action:'status',organization_id:organizationId},request.signal);if(active){setSnapshot(next);if(['active','trialing'].includes(next.status)){setWaiting(false);return;}}} catch { /* Manual refresh remains available. */ }
     if(active)timer=setTimeout(()=>void poll(),3000);
   };
   timer=setTimeout(()=>void poll(),3000);
   const deadline=setTimeout(()=>{if(active){active=false;request.abort();clearTimeout(timer);setWaiting(false);setConfirmationDelayed(true);}},30000);
   return()=>{active=false;request.abort();clearTimeout(timer);clearTimeout(deadline);};
 },[waiting,organizationId]);
 useEffect(()=>{
   if(snapshot&&['active','trialing'].includes(snapshot.status)){setWaiting(false);setConfirmationDelayed(false);setSelected(null);}
 },[snapshot?.status]);
 useEffect(()=>{if(selected){order.current?.focus({preventScroll:true});order.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}},[selected]);
 useLayoutEffect(()=>{
   if(!selected || !order.current || reducedMotion())return;
   const animation=order.current.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:settle});
   return()=>animation.cancel();
 },[selected]);
 const planTrigger=useRef<HTMLElement|null>(null);
 function choose(plan: PaidPlan){planTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setError('');setSelected(plan);feedback.reset('checkout');}
 async function checkout(event: FormEvent<HTMLFormElement>) {
   event.preventDefault(); if(!selected || !snapshot?.can_manage || !snapshot.configured || !feedback.begin('checkout'))return;
   setError(''); const form=new FormData(event.currentTarget);
   try {
     const session=await billingRequest<{transactionId:string;clientToken:string;environment:'sandbox'|'production'}>({action:'checkout',organization_id:organizationId,plan:selected,cycle,billing_email:String(form.get('billing_email')).trim(),business_confirmed:form.get('business')==='on',terms_version:form.get('terms')==='on'?snapshot.terms_version:null});
     await openBillingCheckout(session,{
       completed:()=>{if(alive.current){setConfirmationDelayed(false);setWaiting(true);void load();}},
       closed:()=>{if(alive.current)void load();},
       error:()=>{if(alive.current){setError('Payment could not be completed. Check your details in checkout or try again.');feedback.fail('checkout');}},
     });
     feedback.succeed('checkout');
   } catch(error){if(alive.current){setError(error instanceof Error?error.message:'Checkout could not be opened.');feedback.fail('checkout');}}
 }
 async function portal(){
   if(!snapshot?.can_manage || !feedback.begin('portal'))return;
   setError('');
   try{const result=await billingRequest<{portalUrl:string}>({action:'portal',organization_id:organizationId});const link=new URL(result.portalUrl);if(link.protocol!=='https:'||link.hostname!==(snapshot.environment==='sandbox'?'sandbox-customer-portal.paddle.com':'customer-portal.paddle.com'))throw new Error('The billing portal could not be opened.');window.location.assign(link.href);}
   catch(error){setError(error instanceof Error?error.message:'The billing portal could not be opened.');feedback.fail('portal');}
 }
 const current=planById(snapshot?.plan||'free');
 const date=(value:string)=>new Date(value).toLocaleDateString('en',{day:'numeric',month:'long',year:'numeric'});
 const subscribed=!!snapshot && snapshot.status!=='free' && snapshot.status!=='canceled';
 return <section className="billing-workspace" aria-label="Company plan and billing">
   <div className="billing-summary"><div><span className="eyebrow">YOUR COMPANY PLAN</span><h2>{companyName}, on {current.name}.</h2>
     <p>{!snapshot?'Your company’s plan, usage and billing information.':snapshot.cancel_at?`Your subscription ends on ${date(snapshot.cancel_at)}. Your files will not be automatically deleted.`:snapshot.status==='past_due'?'Your payment needs attention. Update your payment method in the billing portal.':snapshot.period_end?`${snapshot.cycle==='year'?'Yearly':'Monthly'} billing. Current period ends ${date(snapshot.period_end)}.`:'Your workspace is available during beta. Planned Free allowances are shown below; they are not enforced yet.'}</p>
   </div><div className="billing-summary-actions"><span className="billing-state">{!snapshot?'Checking plan':snapshot.environment==='sandbox'?'Sandbox · test payments only':snapshot.status==='free'?'Beta access':snapshot.status.replace('_',' ')}</span>
     {subscribed && <ActionButton variant="secondary" label="Manage billing" pendingLabel="Opening billing…" phase={feedback.phase('portal')} outcomeKey={feedback.version('portal')} disabled={!snapshot?.can_manage||!snapshot?.configured} onClick={()=>void portal()}/>}
     <RefreshControl busy={loading} label="Refresh billing information" pendingLabel="Updating billing information" onRefresh={()=>void load()}/>
   </div></div>
   {loading&&!snapshot&&<div className="billing-refresh"><LoadingIndicator label="Checking your company plan…"/></div>}
   {error&&!selected&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}
   {snapshot&&<div className="billing-usage">
     <Usage label="Active documents" value={snapshot.usage.documents} limit={current.documents}/>
     <Usage label="File storage" value={snapshot.usage.storage_bytes} limit={current.storageBytes} bytes/>
     <Usage label="Team members" value={snapshot.usage.seats} limit={current.seats}/>
     <Usage label="Suppliers" value={snapshot.usage.suppliers} limit={current.suppliers}/>
   </div>}
   {waiting&&<p role="status"><LoadingIndicator label="Confirming your plan with Paddle…"/></p>}
   {confirmationDelayed&&<p className="billing-sync-note" role="status">Your payment confirmation is still syncing. Refresh your plan in a moment. Please don’t start another payment.</p>}
   <div className="pricing-toolbar"><SegmentedControl className="billing-cycle" label="Billing frequency" value={cycle} options={[{value:'month',label:'Monthly'},{value:'year',label:'Yearly · save 16.7%'}]} onChange={value=>{setCycle(value as BillingCycle);feedback.reset('checkout');}}/><p>Per company. EUR, excluding VAT.</p></div>
   <PlanCards cycle={cycle} current={snapshot?.plan} selected={selected} onChoose={choose} disabled={!snapshot?.can_manage||subscribed}/>
   <p className="billing-fine-print">{snapshot&&!snapshot.can_manage?'Your company owner or administrator can manage subscriptions.':!snapshot?.configured?'Paid plans are being activated. No payment is taken and your workspace remains accessible.':'Payments, invoices, payment methods and cancellation are handled securely by Paddle.'} {!snapshot?.quota_enforced&&'During beta, the displayed allowances are planned limits.'}</p>
   {snapshot?.pending&&<p className="billing-fine-print">{snapshot.pending.state==='ready'?`An unfinished ${planById(snapshot.pending.plan).name} ${snapshot.pending.cycle==='year'?'yearly':'monthly'} checkout is available. Choose the same plan and frequency to continue.`:'A previous checkout needs review before another order can be created. No duplicate order will be started.'}</p>}
   {selected&&<section id="billing-order-review" ref={order} className="billing-order" tabIndex={-1} aria-label="Review your selected plan"><div className="billing-order-title"><h3>{planById(selected).name}, for your company.</h3><Button variant="ghost" onClick={()=>{setSelected(null);setError('');planTrigger.current?.focus({preventScroll:true});}}>Close</Button></div>
     <p>€{cycle==='year'?planById(selected).annual:planById(selected).monthly} per {cycle==='year'?'year':'month'}, excluding VAT. Paddle shows your tax and final total before payment.</p>
     {snapshot?.configured?<form onSubmit={checkout}>
       <FieldLabel>Company billing email<Input type="email" name="billing_email" required autoComplete="email" maxLength={254} defaultValue={email}/></FieldLabel>
       <label className="billing-business-confirm"><input type="checkbox" name="business" required/><span>I am authorised to purchase for {companyName}, for business use.</span></label>
       {snapshot.environment==='production'&&<label className="billing-business-confirm"><input type="checkbox" name="terms" required/><span>I accept the <Link to="/terms">business terms</Link> and have read the <Link to="/refunds">refund policy</Link> and <Link to="/privacy">privacy notice</Link>.</span></label>}
       {snapshot.environment==='sandbox'&&<p className="billing-fine-print">Test checkout only. Use Paddle’s sandbox test payment details. No real payment is processed.</p>}
       {error&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}
       <ActionButton type="submit" label={snapshot.environment==='sandbox'?'Open test checkout':'Continue to secure checkout'} pendingLabel="Preparing your checkout…" successLabel="Checkout opened" phase={feedback.phase('checkout')} outcomeKey={feedback.version('checkout')} disabled={loading||waiting}/>
     </form>:<p className="billing-fine-print">Checkout will be available once Paddle is connected and billing is activated. Selecting this plan has not created an order.</p>}
   </section>}
 </section>;
}
function Usage({label,value,limit,bytes=false}:{label:string;value:number;limit:number;bytes?:boolean}) {
 return <div className="billing-meter"><div className="billing-meter-label"><span>{label}</span><span>of {bytes?formatBytes(limit):limit.toLocaleString('en')}</span></div><strong>{bytes?formatBytes(value):value.toLocaleString('en')}</strong><div className="billing-meter-track" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(0,(value/limit)*100))}%`}}/></div></div>;
}

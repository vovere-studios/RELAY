import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './marketing/Website';
import { ActionButton, useActionFeedback } from '../components/ActionFeedback';
import { LoadingIndicator } from '../components/ui';
import { requireSupabase } from '../lib/supabase';
import { billingRequest, openBillingCheckout } from '../lib/billing/client';

export function BillingCheckout() {
 const [params]=useSearchParams(); const navigate=useNavigate(); const id=params.get('_ptxn');
 const [checking,setChecking]=useState(true),[error,setError]=useState(''); const feedback=useActionFeedback(); const alive=useRef(true);
 useEffect(()=>{
  alive.current=true;
  if(!id || !/^txn_[a-z0-9]{26}$/.test(id)){setError('This checkout link is incomplete. Return to your company’s billing settings.');setChecking(false);return;}
  void requireSupabase().auth.getUser().then(({data,error})=>{
   if(!alive.current)return;
   if(error||!data.user){sessionStorage.setItem('relay-pending-paddle-transaction',id);navigate('/login',{replace:true});}
   else setChecking(false);
  });
  return()=>{alive.current=false;};
 },[id,navigate]);
 async function open(){
  if(!id||!feedback.begin('open'))return;setError('');
  try {
   const session=await billingRequest<{transactionId:string;clientToken:string;environment:'sandbox'|'production';organizationId:string}>({action:'resume',transaction_id:id});
   await openBillingCheckout(session,{completed:()=>{if(alive.current)navigate(`/cloud?view=settings&section=Billing&org=${session.organizationId}`);},closed:()=>{if(alive.current)feedback.reset('open');},error:()=>{if(alive.current){setError('Payment could not be completed. Check your details or try again.');feedback.fail('open');}}});feedback.succeed('open');
  }catch(error){setError(error instanceof Error?error.message:'Checkout could not be opened.');feedback.fail('open');}
 }
 return <div className="public-site"><PublicHeader/><main id="main" tabIndex={-1} className="public-main pricing-main"><section className="billing-summary"><div><span className="eyebrow">YOUR COMPANY CHECKOUT</span><h1>One clear next step.</h1><p>Continue to Paddle to review your company details, taxes and payment. Your plan is confirmed securely after the payment has been verified.</p>{error&&<p role="alert" className="form-error">{error}</p>}</div><div className="billing-summary-actions">{checking?<LoadingIndicator label="Checking your sign-in…"/>:<ActionButton label="Continue to checkout" phase={feedback.phase('open')} outcomeKey={feedback.version('open')} disabled={!id} onClick={()=>void open()}/>}<Link className="text-link" to="/cloud?view=settings&section=Billing">Back to plan & billing</Link></div></section></main><PublicFooter/></div>;
}

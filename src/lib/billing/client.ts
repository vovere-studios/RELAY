import { requireSupabase } from '../supabase';
import type { PlanId, BillingCycle, PaidPlan } from './plans';
export type BillingSnapshot = {
 plan: PlanId; cycle: BillingCycle | null; status: 'free' | 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';
 period_end: string | null; cancel_at: string | null; can_manage: boolean; configured: boolean;
 environment: 'sandbox' | 'production'; quota_enforced: boolean; terms_version: string | null;
 usage: { documents: number; storage_bytes: number; seats: number; suppliers: number };
 pending: { state: 'creating' | 'ready' | 'uncertain'; plan: PaidPlan; cycle: BillingCycle; created_at: string } | null;
};
export async function billingRequest<T>(body: object, signal?: AbortSignal): Promise<T> {
 const { data, error } = await requireSupabase().auth.getSession();
 if(error || !data.session) throw new Error('Sign in to your company workspace.');
 const response = await fetch('/api/billing/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body), signal });
 const result = await response.json() as T & { error?: string };
 if (!response.ok) throw new Error(result.error || 'Billing is temporarily unavailable. Please try again.');
 return result;
}

type CheckoutSession = { transactionId: string; clientToken: string; environment: 'sandbox' | 'production' };
export type PaddleBrowser = {
 Environment: { set: (environment: 'sandbox') => void };
 Initialize: (options: { token: string; eventCallback: (event: { name: string }) => void }) => void;
 Update: (options: { eventCallback: (event: { name: string }) => void }) => void;
 Checkout: { open: (options: { transactionId: string; settings: { displayMode: 'overlay'; theme: 'light' | 'dark'; allowLogout: false; showAddTaxId: true } }) => void };
};
declare global { interface Window { Paddle?: PaddleBrowser } }
let scriptPromise: Promise<PaddleBrowser> | undefined;
let initialized: string | undefined;
function loadPaddle() {
 if (window.Paddle) return Promise.resolve(window.Paddle);
 scriptPromise ??= new Promise<PaddleBrowser>((resolve,reject) => {
   const script = document.createElement('script'); script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'; script.async = true;
   const timeout = window.setTimeout(()=>{script.remove();reject(new Error('Payment checkout took too long to load. Please try again.'));},15000);
   script.onload = ()=>{clearTimeout(timeout);window.Paddle ? resolve(window.Paddle) : reject(new Error('Payment checkout could not be loaded.'));};
   script.onerror = ()=>{clearTimeout(timeout);script.remove();reject(new Error('Check your connection and try again.'));};
   document.head.append(script);
 }).catch(error=>{scriptPromise=undefined;throw error;});
 return scriptPromise;
}
/** The provider script loads only when a signed-in administrator chooses checkout. */
export async function openBillingCheckout(session: CheckoutSession, callbacks: { completed: ()=>void; closed: ()=>void; error: ()=>void }) {
 const paddle = await loadPaddle();
 const key = `${session.environment}:${session.clientToken}`;
 const callback = (event: {name:string})=>{
   if(event.name==='checkout.completed') callbacks.completed();
   if(event.name==='checkout.closed') callbacks.closed();
   if(event.name==='checkout.error') callbacks.error();
 };
 if(initialized && initialized!==key) throw new Error('Payment configuration changed. Refresh this page before continuing.');
 if(!initialized) {
   if(session.environment==='sandbox') paddle.Environment.set('sandbox');
   paddle.Initialize({token:session.clientToken,eventCallback:callback}); initialized=key;
 } else paddle.Update({eventCallback:callback});
 paddle.Checkout.open({transactionId:session.transactionId,settings:{displayMode:'overlay',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',allowLogout:false,showAddTaxId:true}});
}

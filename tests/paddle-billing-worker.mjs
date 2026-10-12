import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../.output/server/index.mjs';
const id=(prefix,letter='a')=>`${prefix}_${letter.repeat(26)}`;
const org='11111111-1111-1111-1111-111111111111', actor='22222222-2222-2222-2222-222222222222', attempt='33333333-3333-3333-3333-333333333333';
Object.assign(process.env,{PADDLE_ENVIRONMENT:'sandbox',RELAY_PADDLE_SANDBOX_ENABLED:'true',PADDLE_API_KEY:'pdl_sdbx_apikey_fixture-only',PADDLE_CLIENT_TOKEN:'test_fixture-only',PADDLE_WEBHOOK_SECRET:'fixture-not-a-real-secret',RELAY_SUPABASE_SECRET_KEY:'sb_secret_fixture-only',PADDLE_CORE_MONTHLY_PRICE_ID:id('pri','a'),PADDLE_PRO_MONTHLY_PRICE_ID:id('pri','b'),PADDLE_CORE_ANNUAL_PRICE_ID:id('pri','c'),PADDLE_PRO_ANNUAL_PRICE_ID:id('pri','d')});
const originalFetch=globalThis.fetch;
const calls=[]; let checkoutCount=0, applies=0, pending=false, completed=true, failProvider=false;
const snapshot={plan:'free',cycle:null,status:'free',period_end:null,cancel_at:null,can_manage:true,usage:{documents:0,storage_bytes:0,seats:1,suppliers:0},pending:null,quota_enforced:false};
const sub={id:id('sub'),customer_id:id('ctm'),status:'active',updated_at:new Date().toISOString(),custom_data:{relay_checkout_attempt:attempt},current_billing_period:{ends_at:new Date(Date.now()+30*86400000).toISOString()},scheduled_change:null,items:[{quantity:1,price:{id:id('pri'),unit_price:{amount:'2900',currency_code:'EUR'},billing_cycle:{interval:'month',frequency:1}}}]};
const request=(path,body,headers={})=>new Request(`https://relay.vovere-studios.com${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://relay.vovere-studios.com',Authorization:'Bearer fixture-access-token',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const run=request=>worker.fetch(request,{}, {waitUntil(){}});
try {
 globalThis.fetch=async(input,options)=>{
  const url=new URL(typeof input==='string'?input:input.url);const raw=options?.body|| (input instanceof Request?await input.text():'');const body=raw?JSON.parse(raw):{};calls.push({host:url.hostname,path:url.pathname,body});
  if(url.pathname==='/auth/v1/user')return Response.json({id:actor,email:'owner@example.invalid',role:'authenticated',app_metadata:{},user_metadata:{}});
  if(url.pathname==='/rest/v1/rpc/relay_billing_snapshot')return Response.json(snapshot);
  if(url.pathname==='/rest/v1/organizations')return Response.json({legal_name:'Fixture company'});
  if(url.pathname==='/rest/v1/rpc/relay_billing_service'){
   if(body.action==='begin'){if(body.payload.actor_id!==actor)throw new Error('Actor not derived from authenticated user');const created=!pending;pending=true;return Response.json({id:attempt,created,state:created?'creating':'ready',customer_id:created?null:id('ctm'),transaction_id:created?null:id('txn')});}
   if(body.action==='portal')return Response.json({customer_id:id('ctm'),subscription_id:id('sub')});
   if(body.action==='event_binding')return Response.json({transaction_id:id('txn')});
   if(body.action==='apply'){applies++;return Response.json({applied:true});}
   if(body.action==='resume')return Response.json({organization_id:org});
   return Response.json({saved:true});
  }
  if(url.hostname!=='sandbox-api.paddle.com')throw new Error('Unexpected external network call');
  if(failProvider)return Response.json({error:{detail:'Private provider error'}},{status:500});
  if(url.pathname==='/customers')return Response.json({data:{id:id('ctm'),email:body.email,custom_data:body.custom_data}});
  if(url.pathname==='/transactions'){checkoutCount++;assert.deepEqual(body.items,[{price_id:id('pri'),quantity:1}]);return Response.json({data:{id:id('txn'),customer_id:id('ctm'),checkout:{url:`https://relay.vovere-studios.com/pay?_ptxn=${id('txn')}`}}});}
  if(url.pathname===`/transactions/${id('txn')}`)return Response.json({data:{id:id('txn'),customer_id:id('ctm'),subscription_id:completed?id('sub'):null,status:completed?'completed':'ready',custom_data:{relay_checkout_attempt:attempt}}});
  if(url.pathname===`/subscriptions/${id('sub')}`)return Response.json({data:sub});
  if(url.pathname===`/customers/${id('ctm')}/portal-sessions`)return Response.json({data:{customer_id:id('ctm'),urls:{general:{overview:'https://sandbox-customer-portal.paddle.com/fixture?token=temporary-fixture'}}}});
  throw new Error(`Unexpected mocked path: ${url.pathname}`);
 };
 let result=await run(request('/api/billing/workspace',{action:'status',organization_id:org},{Origin:'https://untrusted.invalid'}));assert.equal(result.status,403);assert.equal(calls.length,0);
 result=await run(request('/api/billing/workspace',{action:'status',organization_id:org},{Authorization:''}));assert.equal(result.status,401);
 result=await run(request('/api/billing/workspace',{action:'status',organization_id:org}));assert.equal(result.status,200);assert.equal((await result.json()).configured,true);
 result=await run(request('/api/billing/workspace',{action:'checkout',organization_id:org,plan:'core',cycle:'month',billing_email:'owner@example.invalid',business_confirmed:false}));assert.equal(result.status,400);assert.equal(checkoutCount,0);
 const order={action:'checkout',organization_id:org,plan:'core',cycle:'month',billing_email:'owner@example.invalid',business_confirmed:true};
 result=await run(request('/api/billing/workspace',order));assert.equal(result.status,200);const session=await result.json();assert.equal(session.transactionId,id('txn'));assert.equal(session.environment,'sandbox');assert.equal(checkoutCount,1);
 assert.equal(calls.find(call=>call.path==='/customers').body.custom_data.relay_workspace_id,org);
 completed=false;result=await run(request('/api/billing/workspace',order));assert.equal(result.status,200);assert.equal(checkoutCount,1);
 result=await run(request('/api/billing/workspace',{action:'portal',organization_id:org}));assert.equal(result.status,200);assert.match((await result.json()).portalUrl,/^https:\/\/sandbox-customer-portal\.paddle\.com\//);
 result=await run(request('/api/billing/workspace',{action:'resume',transaction_id:id('txn')}));assert.equal(result.status,200);assert.equal((await result.json()).organizationId,org);
 const webhook={event_id:id('evt'),event_type:'subscription.created',occurred_at:new Date().toISOString(),data:{id:id('sub')}};
 const raw=JSON.stringify(webhook);const ts=Math.floor(Date.now()/1000);const signature=`ts=${ts};h1=${createHmac('sha256',process.env.PADDLE_WEBHOOK_SECRET).update(`${ts}:${raw}`).digest('hex')}`;
 result=await run(request('/api/billing/webhook',raw));assert.equal(result.status,400);assert.equal(applies,0);
 result=await run(request('/api/billing/webhook',raw,{'Paddle-Signature':signature}));assert.equal(result.status,503);assert.equal(applies,0,'Incomplete original order must not grant a subscription');
 completed=true;result=await run(request('/api/billing/webhook',raw,{'Paddle-Signature':signature}));assert.equal(result.status,200);assert.equal(applies,1);
 sub.items[0].price.unit_price.amount='1';result=await run(request('/api/billing/webhook',raw,{'Paddle-Signature':signature}));assert.equal(result.status,503);assert.equal(applies,1,'Wrong amount must not grant a plan');sub.items[0].price.unit_price.amount='2900';
 failProvider=true;result=await run(request('/api/billing/workspace',{action:'portal',organization_id:org}));assert.equal(result.status,503);const errorText=await result.text();assert.ok(!errorText.includes('Private provider error'));assert.ok(!errorText.includes(process.env.PADDLE_API_KEY));failProvider=false;
 const page=await run(new Request('https://relay.vovere-studios.com/pricing'));assert.equal(page.status,200);assert.equal(page.headers.get('X-Robots-Tag'),null);const html=await page.text();assert.ok(html.includes('Plans for your company'));assert.ok(html.includes('A plan that fits.'));assert.match(html,/€(?:<!--.*?-->)*29/);assert.ok(!html.includes('pdl_sdbx_apikey_fixture-only'));
 const preview=await run(new Request('https://preview.example.invalid/pricing'));assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');
 console.log('Built billing worker passed: origin/auth gates, status, B2B confirmation, server-authorized company checkout, pending checkout reuse, portal/resume, signature verification, completed original order binding, exact EUR prices, sanitized errors and pricing SSR. All network traffic mocked; no charges.');
} finally {globalThis.fetch=originalFetch;}

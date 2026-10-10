import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { sendLovableEmail } from '@lovable.dev/email-js';
const url='https://aadbcovypefhlpsmoinn.supabase.co';
const publicKey='sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Delivery={receipt:string;sender:string;receiver:string;sender_email:string|null;recipient_emails:string[];count:number};
export async function submissionEmail(request:Request) {
 const bearer=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!bearer)return new Response('Sign in required',{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Origin denied',{status:403});
 const secret=process.env.RELAY_SUPABASE_SECRET_KEY;const apiKey=process.env.LOVABLE_API_KEY;
 if(!secret||!apiKey)return Response.json({emailStatus:'not_configured'},{status:503});
 const reader=request.body?.getReader();if(!reader)return new Response('Invalid request',{status:400});
 const decoder=new TextDecoder();let raw='';let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1024){await reader.cancel();return new Response('Request too large',{status:413});}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();
 let body:{organization_id:string;token:string};
 try{body=JSON.parse(raw);if(!/^[a-f0-9-]{36}$/i.test(body.organization_id)||! /^[a-f0-9]{64}$/.test(body.token))throw new Error();}catch{return new Response('Invalid request',{status:400});}
 const authClient=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${bearer}`}}});
 const {data,error}=await authClient.auth.getUser(bearer);if(error||!data.user)return new Response('Sign in required',{status:401});
 const permitted=await authClient.rpc('relay_exchange_api',{action:'organizations',payload:{}});
 if(permitted.error||!Array.isArray(permitted.data)||!permitted.data.some((org:{id:string})=>org.id===body.organization_id))return new Response('Company access denied',{status:403});
 const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // This service-only RPC derives recipients from a completed receipt and verifies the actor's company role.
 const result=await client.rpc('relay_exchange_delivery',{org:body.organization_id,actor:data.user.id,token:body.token});
 if(result.error)return Response.json({emailStatus:'unavailable'},{status:403});
 const delivery=result.data as Delivery;
 const jobs=[...(delivery.sender_email?[{to:delivery.sender_email,sender:true}]:[]),...delivery.recipient_emails.map(to=>({to,sender:false}))];
 const results=await Promise.allSettled(jobs.map(async job=>{
  const title=job.sender?'Your documents have been sent.':'Your documents have arrived.';
  const message=job.sender?`${delivery.count} documents are now available to ${delivery.receiver}. Your originals stay in your workspace.`:`${delivery.sender} shared ${delivery.count} documents with ${delivery.receiver}. Open your workspace to review them.`;
  const action=job.sender?'Open my documents':'Review documents';
  const link='https://relay.vovere-studios.com/cloud?view=documents';
  const recipientHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(job.to)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  const sent=await sendLovableEmail({to:job.to,from:{name:'RELAY',address:'noreply@relay.vovere-studios.com'},sender_domain:'notify.relay.vovere-studios.com',reply_to:'admin@vovere-studios.com',subject:title,html:`<!doctype html><html><body style="margin:0;background:#f6f6f6;color:#171717;font-family:Helvetica Neue,Helvetica,Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:48px 20px"><table role="presentation" width="560" style="max-width:100%;border:1px solid #e9e9e9;border-radius:24px;background:white"><tr><td style="padding:40px 32px"><p style="font-size:34px;letter-spacing:-2px;margin:0 0 40px">relay ↗</p><p style="font-size:10px;letter-spacing:1.5px;color:#777">INFORMATION, CONNECTED</p><h1 style="font-size:32px;line-height:1.2;font-weight:500;letter-spacing:-1px">${escape(title)}</h1><p style="font-size:15px;line-height:1.8;color:#666">${escape(message)}</p><p style="margin:30px 0"><a href="${link}" style="display:inline-block;padding:16px 24px;border-radius:12px;background:#171717;color:white;text-decoration:none;font-size:13px">${action} ↗</a></p><p style="border-top:1px solid #eee;padding-top:24px;font-size:11px;color:#777">Supplier information, connected.<br>A product of VOVERE Studios.</p></td></tr></table></td></tr></table></body></html>`,text:`${title}\n${message}\n${action}: ${link}`,purpose:'transactional',label:'document-submission',idempotency_key:`submission-${delivery.receipt}-${job.sender?'sender':'receiver'}-${recipientHash}`},{apiKey,sendUrl:process.env.LOVABLE_SEND_URL});
  if(!sent.success)throw new Error('Delivery failed');
 }));
 return Response.json({emailStatus:jobs.length&&results.every(r=>r.status==='fulfilled')?'sent':'failed'},{headers:{'Cache-Control':'no-store'}});
}
export const Route=createFileRoute('/api/workspace/submission-email')({server:{handlers:{POST:({request})=>submissionEmail(request)}}});

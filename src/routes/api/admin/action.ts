import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { sendLovableEmail } from '@lovable.dev/email-js';
import type { Database } from '../../../lib/database.types';
const escape=(value:string)=>value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
export async function platformAction(request:Request):Promise<Response>{
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return new Response('Sign in required',{status:401});
 const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)return new Response('Origin denied',{status:403});
 const reader=request.body?.getReader();let body='';let size=0;const decoder=new TextDecoder();
 if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();return new Response('Request too large',{status:413});}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();}
 let input:{action:string;organization_id:string;reason:string};try{input=JSON.parse(body);if(!['suspend','reactivate'].includes(input.action)||typeof input.organization_id!=='string'||typeof input.reason!=='string'||input.reason.length>500)throw new Error();}catch{return new Response('Invalid action',{status:400});}
 const client=createClient<Database>('https://aadbcovypefhlpsmoinn.supabase.co','sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:user,error:authError}=await client.auth.getUser(token);if(authError||!user.user)return new Response('Sign in required',{status:401});
 const {data,error}=await client.rpc('relay_platform_admin',{action:input.action,payload:{organization_id:input.organization_id,reason:input.reason}});
 if(error)return Response.json({error:error.message},{status:403});
 let emailStatus='not_configured';const apiKey=process.env.LOVABLE_API_KEY;
 if(apiKey){try{
  await sendLovableEmail({to:'admin@vovere-studios.com',from:{name:'RELAY',address:'noreply@relay.vovere-studios.com'},sender_domain:'notify.relay.vovere-studios.com',reply_to:'admin@vovere-studios.com',subject:`RELAY company ${input.action==='suspend'?'suspended':'reactivated'}`,html:`<!doctype html><html><body style="margin:0;background:#fff;color:#111;font-family:Helvetica Neue,Helvetica,Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="560" style="max-width:100%;padding:40px 24px"><tr><td><p style="font-size:30px;letter-spacing:-1.5px">relay</p><p style="font-size:10px;letter-spacing:1.5px;color:#666">PLATFORM OPERATIONS</p><h1 style="font-size:32px;line-height:1.2;font-weight:500">Company access ${input.action==='suspend'?'suspended':'restored'}.</h1><p style="font-size:15px;line-height:1.7">${escape(input.reason)}</p><p style="font-size:12px;color:#666">Company ID: ${escape(input.organization_id)}<br>Operator: ${escape(user.user.email||'')}</p><a href="https://relay.vovere-studios.com/admin" style="color:#111">Review in RELAY administration</a><p style="border-top:1px solid #ddd;padding-top:24px;margin-top:40px;font-size:12px;color:#666">A product of VOVERE Studios.</p></td></tr></table></td></tr></table></body></html>`,text:`Company access ${input.action}.\nReason: ${input.reason}\nCompany: ${input.organization_id}\nReview: https://relay.vovere-studios.com/admin`,purpose:'transactional',label:'platform-access',idempotency_key:`platform-access-${crypto.randomUUID()}`},{apiKey,sendUrl:process.env.LOVABLE_SEND_URL});emailStatus='sent';
 }catch{emailStatus='failed';console.error('[relay-platform] Operator notification failed');}}
 return Response.json({saved:data,emailStatus});
}
export const Route=createFileRoute('/api/admin/action')({server:{handlers:{POST:({request})=>platformAction(request)}}});

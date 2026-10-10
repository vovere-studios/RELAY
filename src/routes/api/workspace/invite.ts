import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { sendLovableEmail } from '@lovable.dev/email-js';
import type { Database } from '../../../lib/database.types';
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function inviteTeammate(request:Request):Promise<Response> {
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return new Response('Sign in required',{status:401});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response('Origin denied',{status:403});
 const reader=request.body?.getReader();let body='';let size=0;const decoder=new TextDecoder();
 if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();return new Response('Request too large',{status:413});}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();}
 let input:{organization_id:string;email:string;role:'admin'|'member'};
 try{input=JSON.parse(body);if(!uuid.test(input.organization_id)||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email)||!['admin','member'].includes(input.role))throw new Error();}catch{return new Response('Invalid invitation',{status:400});}
 const client=createClient<Database>('https://aadbcovypefhlpsmoinn.supabase.co','sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const user=await client.auth.getUser(token);if(user.error||!user.data.user)return new Response('Sign in required',{status:401});
 // The existing RPC checks administrator rights, validates the recipient and enforces its hourly limit.
 const created=await client.rpc('relay_workspace_api',{action:'invite',payload:input});
 if(created.error)return Response.json({error:created.error.message},{status:403});
 const invitation=created.data as {id:string;token:string};
 if(!invitation?.id||!invitation.token)return Response.json({error:'The invitation could not be confirmed.'},{status:502});
 let emailStatus:'sent'|'failed'|'not_configured'|'suppressed'='not_configured';
 const apiKey=process.env.LOVABLE_API_KEY;
 if(apiKey){
  try{
   const org=await client.from('organizations').select('legal_name').eq('id',input.organization_id).single();if(org.error)throw org.error;
   const company=org.data.legal_name;const link=`https://relay.vovere-studios.com/join#token=${encodeURIComponent(invitation.token)}`;
   const delivery=await sendLovableEmail({to:input.email.trim().toLowerCase(),from:{name:'RELAY',address:'noreply@relay.vovere-studios.com'},sender_domain:'notify.relay.vovere-studios.com',reply_to:'admin@vovere-studios.com',subject:`Join ${company} on RELAY`,html:`<!doctype html><html><body style="margin:0;background:#fafafa;color:#161616;font-family:Helvetica Neue,Helvetica,Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:48px 20px"><table role="presentation" width="560" style="max-width:100%;background:#fff;border:1px solid #e8e8e8;border-radius:24px"><tr><td style="padding:40px 32px"><p style="font-size:32px;letter-spacing:-2px;margin:0 0 40px">relay ↗</p><p style="font-size:10px;letter-spacing:1.4px;color:#777">YOUR COMPANY WORKSPACE</p><h1 style="font-weight:500;font-size:32px;line-height:1.2;letter-spacing:-1.2px">Better, together.</h1><p style="font-size:15px;line-height:1.8;color:#666">You have been invited to join ${escape(company)} as ${input.role==='admin'?'an administrator':'a team member'}. Open the invitation and sign in with ${escape(input.email)}.</p><p style="margin:30px 0"><a href="${escape(link)}" style="display:inline-block;background:#161616;color:#fff;text-decoration:none;border-radius:12px;padding:15px 24px;font-size:13px">Join your workspace ↗</a></p><p style="font-size:12px;line-height:1.7;color:#777">This invitation expires in seven days. If you were not expecting it, you can ignore this email.</p><p style="border-top:1px solid #eee;padding-top:24px;margin-top:40px;font-size:11px;color:#777">Supplier information, connected.<br>A product of VOVERE Studios.</p></td></tr></table></td></tr></table></body></html>`,text:`You are invited to ${company} on RELAY as ${input.role}.\nSign in with ${input.email}.\nJoin: ${link}\nThe invitation expires in seven days.`,purpose:'transactional',label:'team-invitation',idempotency_key:`team-invitation-${invitation.id}`},{apiKey,sendUrl:process.env.LOVABLE_SEND_URL});
   emailStatus=delivery.success ? 'sent' : 'failed';
  }catch(failure){emailStatus=typeof failure==='object'&&failure&&'code' in failure&&failure.code==='recipient_suppressed'?'suppressed':'failed';console.error('[relay-invite] Delivery was not completed');}
 }
 return Response.json({...invitation,emailStatus},{headers:{'Cache-Control':'no-store'}});
}
export const Route=createFileRoute('/api/workspace/invite')({server:{handlers:{POST:({request})=>inviteTeammate(request)}}});

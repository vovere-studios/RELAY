import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { sendSubmissionConfirmation } from '../../../lib/submission-mail.server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function confirmGuestSubmission(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Origin denied',{status:403});
 const reader=request.body?.getReader();if(!reader)return new Response('Invalid request',{status:400});let raw='';let size=0;const decoder=new TextDecoder();
 while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>2048){await reader.cancel();return new Response('Request too large',{status:413});}raw+=decoder.decode(chunk.value,{stream:true});}raw+=decoder.decode();
 let input:{token:string;document_ids:string[];reservation_id:string};
 try{input=JSON.parse(raw);if(!uuid.test(input.reservation_id)||!/^[a-f0-9]{64}$/.test(input.token)||!Array.isArray(input.document_ids)||input.document_ids.length<1||input.document_ids.length>5||input.document_ids.some(id=>!uuid.test(id))||new Set(input.document_ids).size!==input.document_ids.length)throw new Error();}catch{return new Response('Invalid request',{status:400});}
 const secret=process.env.RELAY_SUPABASE_SECRET_KEY;const apiKey=process.env.LOVABLE_API_KEY;
 if(!secret||!apiKey)return Response.json({emailStatus:'not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
 const client=createClient('https://aadbcovypefhlpsmoinn.supabase.co',secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const link=await client.from('upload_links').select('id,organization_id').eq('token_hash',hash).single();
 if(link.error)return new Response('Submission unavailable',{status:403});
 const reservation=await client.from('intake_reservations').select('id,file_count,created_at').eq('id',input.reservation_id).eq('link_id',link.data.id).eq('status','complete').single();
 if(reservation.error||reservation.data.file_count!==input.document_ids.length)return new Response('Submission unavailable',{status:403});
 const docs=await client.from('documents').select('id,submitted_by_email,submitted_by_name').eq('intake_link_id',link.data.id).in('id',input.document_ids).gte('uploaded_at',reservation.data.created_at).lte('uploaded_at',new Date(Date.parse(reservation.data.created_at)+10*60*1000).toISOString());
 if(docs.error||docs.data.length!==input.document_ids.length)return new Response('Submission unavailable',{status:403});
 const first=docs.data[0];if(!first.submitted_by_email||!first.submitted_by_name||docs.data.some(d=>d.submitted_by_email!==first.submitted_by_email||d.submitted_by_name!==first.submitted_by_name))return new Response('Submission unavailable',{status:403});
 const org=await client.from('organizations').select('owner_id,legal_name').eq('id',link.data.organization_id).single();
 const members=await client.from('organization_members').select('user_id').eq('organization_id',link.data.organization_id).in('role',['owner','admin']).limit(10);
 if(org.error||members.error)return Response.json({emailStatus:'failed'},{status:502});
 const userIds=[...new Set([org.data.owner_id,...members.data.map(m=>m.user_id)])];
 const users=await Promise.all(userIds.map(id=>client.auth.admin.getUserById(id)));
 // A lookup failure must remain retryable, rather than claiming everyone was notified.
 if(users.some(u=>u.error))return Response.json({emailStatus:'failed'},{status:502});
 const recipients=[...new Set(users.flatMap(u=>u.data.user?.email_confirmed_at&&u.data.user.email?[u.data.user.email]:[]))];
 const emailStatus=await sendSubmissionConfirmation({receipt:`guest-${reservation.data.id}`,sender:first.submitted_by_name,receiver:org.data.legal_name,sender_email:first.submitted_by_email,recipient_emails:recipients,count:docs.data.length,guest:true},apiKey);
 return Response.json({emailStatus},{headers:{'Cache-Control':'no-store'}});
}
export const Route=createFileRoute('/api/intake/confirmation')({server:{handlers:{POST:({request})=>confirmGuestSubmission(request)}}});

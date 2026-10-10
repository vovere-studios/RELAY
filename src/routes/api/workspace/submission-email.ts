import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { sendSubmissionConfirmation } from '../../../lib/submission-mail.server';
const url='https://aadbcovypefhlpsmoinn.supabase.co';
const publicKey='sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0';
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
 return Response.json({emailStatus:await sendSubmissionConfirmation(delivery,apiKey)},{headers:{'Cache-Control':'no-store'}});
}
export const Route=createFileRoute('/api/workspace/submission-email')({server:{handlers:{POST:({request})=>submissionEmail(request)}}});

import { sendLovableEmail } from '@lovable.dev/email-js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Delivery={receipt:string;sender:string;receiver:string;sender_email:string|null;recipient_emails:string[];count:number;guest?:boolean};
export async function sendSubmissionConfirmation(delivery:Delivery,apiKey:string):Promise<'sent'|'failed'> {
 const jobs=[...(delivery.sender_email?[{to:delivery.sender_email,sender:true}]:[]),...delivery.recipient_emails.map(to=>({to,sender:false}))];
 const results=await Promise.allSettled(jobs.map(async job=>{
  const title=job.sender?'Your documents have been sent.':'Your documents have arrived.';
  const message=job.sender?`${delivery.count} documents are now available to ${delivery.receiver}. ${delivery.guest?'':'Your originals stay in your workspace.'}`:`${delivery.sender} shared ${delivery.count} documents with ${delivery.receiver}. Open your workspace to review them.`;
  const action=job.sender?(delivery.guest?'Discover RELAY':'Open my documents'):'Review documents';
  const link=job.sender&&delivery.guest?'https://relay.vovere-studios.com/':'https://relay.vovere-studios.com/cloud?view=documents';
  const recipientHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(job.to)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  const sent=await sendLovableEmail({to:job.to,from:{name:'RELAY',address:'noreply@relay.vovere-studios.com'},sender_domain:'notify.relay.vovere-studios.com',reply_to:'admin@vovere-studios.com',subject:title,html:`<!doctype html><html><body style="margin:0;background:#f6f6f6;color:#171717;font-family:Helvetica Neue,Helvetica,Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:48px 20px"><table role="presentation" width="560" style="max-width:100%;border:1px solid #e9e9e9;border-radius:24px;background:white"><tr><td style="padding:40px 32px"><p style="font-size:34px;letter-spacing:-2px;margin:0 0 40px">relay ↗</p><p style="font-size:10px;letter-spacing:1.5px;color:#777">INFORMATION, CONNECTED</p><h1 style="font-size:32px;line-height:1.2;font-weight:500;letter-spacing:-1px">${escape(title)}</h1><p style="font-size:15px;line-height:1.8;color:#666">${escape(message)}</p><p style="margin:30px 0"><a href="${link}" style="display:inline-block;padding:16px 24px;border-radius:12px;background:#171717;color:white;text-decoration:none;font-size:13px">${action} ↗</a></p><p style="border-top:1px solid #eee;padding-top:24px;font-size:11px;color:#777">Supplier information, connected.<br>A product of VOVERE Studios.</p></td></tr></table></td></tr></table></body></html>`,text:`${title}\n${message}\n${action}: ${link}`,purpose:'transactional',label:'document-submission',idempotency_key:`submission-${delivery.receipt}-${job.sender?'sender':'receiver'}-${recipientHash}`},{apiKey,sendUrl:process.env.LOVABLE_SEND_URL});
  if(!sent.success)throw new Error('Delivery failed');
 }));
 return jobs.length&&results.every(r=>r.status==='fulfilled')?'sent':'failed';
}

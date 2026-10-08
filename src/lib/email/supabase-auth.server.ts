import { Webhook } from 'standardwebhooks';
import { sendLovableEmail } from '@lovable.dev/email-js';

type Action = 'signup' | 'magiclink' | 'invite' | 'recovery' | 'email_change' | 'reauthentication';
type Payload = { user: { email: string; new_email?: string }; email_data: { email_action_type: Action; token: string; token_new?: string; token_hash: string; token_hash_new?: string } };
const titles: Record<Action, string> = { signup: 'Confirm your RELAY account', magiclink: 'Your RELAY sign-in code', invite: 'Your RELAY invitation', recovery: 'Recover your RELAY account', email_change: 'Confirm your RELAY email address', reauthentication: 'Your RELAY verification code' };
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function authMessages(payload: Payload) {
 const { user, email_data: data } = payload;
 if (!user || !data || !Object.hasOwn(titles, data.email_action_type)) throw new Error('Invalid auth email');
 const action = data.email_action_type;
 const messages = action === 'email_change'
  ? data.token_hash_new
    ? [{ to: user.email, token: data.token, hash: data.token_hash_new }, { to: user.new_email || '', token: data.token_new || '', hash: data.token_hash }]
    : [{ to: user.new_email || '', token: data.token_new || data.token, hash: data.token_hash }]
  : [{ to: user.email, token: data.token, hash: data.token_hash }];
 return messages.map(message => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.to) || !/^\d{6,10}$/.test(message.token)) throw new Error('Invalid auth recipient or code');
  const url = new URL('https://aadbcovypefhlpsmoinn.supabase.co/auth/v1/verify');
  url.searchParams.set('token', message.hash); url.searchParams.set('type', action);
  url.searchParams.set('redirect_to', action === 'recovery' ? 'https://relay.vovere-studios.com/account-security' : 'https://relay.vovere-studios.com/account');
  const showLink = action !== 'reauthentication';
  if (showLink && (typeof message.hash !== 'string' || !message.hash)) throw new Error('Missing confirmation hash');
  const text = `${titles[action]}\n\n${message.token}\n\nEnter this code in RELAY. It is valid for a short time and can only be used once.${showLink ? `\n\nContinue: ${url.href}` : ''}\n\nIf you did not request this email, you can ignore it. Never share your code.\nRELAY — A product of VOVERE Studios.`;
  const html = `<div style="background:#f4f4f2;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;color:#161616"><div style="max-width:480px;margin:auto;background:white;padding:40px;border-radius:20px"><p style="font-size:22px;font-weight:600;letter-spacing:-1px">relay ↗</p><h1 style="font-size:25px;line-height:1.3">${escape(titles[action])}</h1><p>Enter your verification code in RELAY.</p><p style="font-size:34px;letter-spacing:6px;font-weight:600">${message.token}</p><p style="color:#666;font-size:14px;line-height:1.6">Your code is valid for a short time and can only be used once. Never share it.</p>${showLink ? `<p><a href="${escape(url.href)}" style="display:inline-block;background:#161616;color:white;padding:14px 22px;border-radius:10px;text-decoration:none">Continue to RELAY ↗</a></p>` : ''}<p style="color:#777;font-size:12px;line-height:1.6">If you did not request this email, you can ignore it.</p><hr style="border:0;border-top:1px solid #eee;margin:32px 0"><p style="font-size:11px;color:#777">A product of VOVERE Studios.</p></div></div>`;
  return { ...message, subject: titles[action], html, text, action };
 });
}

export async function handleSupabaseAuthEmail(request: Request): Promise<Response> {
 const secret = process.env.RELAY_AUTH_EMAIL_HOOK_SECRET || process.env.SUPABASE_AUTH_EMAIL_HOOK_SECRET;
 const apiKey = process.env.LOVABLE_API_KEY;
 if (!secret || !apiKey) return new Response('Email service is not configured', {status:503});
 const raw = await request.text();
 if (raw.length > 65536) return new Response('Payload too large', {status:413});
 let payload: Payload;
 try { payload = new Webhook(secret.replace(/^v1,/, '')).verify(raw, Object.fromEntries(request.headers)) as Payload; }
 catch { return new Response('Invalid webhook signature', {status:401}); }
 let messages: ReturnType<typeof authMessages>;
 try { messages = authMessages(payload); } catch { return new Response('Invalid email request', {status:400}); }
 try {
  for (const [index, message] of messages.entries()) {
   await sendLovableEmail({to:message.to,from:{name:'RELAY',address:'noreply@relay.vovere-studios.com'},sender_domain:'notify.relay.vovere-studios.com',reply_to:'admin@vovere-studios.com',subject:message.subject,html:message.html,text:message.text,purpose:'transactional',label:`auth-${message.action}`,idempotency_key:`supabase-auth-${request.headers.get('webhook-id')}-${index}`},{apiKey,sendUrl:process.env.LOVABLE_SEND_URL});
  }
  return Response.json({});
 } catch { console.error('[relay-auth-email] Delivery failed'); return new Response('Email delivery failed', {status:502}); }
}

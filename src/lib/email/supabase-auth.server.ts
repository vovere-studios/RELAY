import { Webhook } from 'standardwebhooks';
import { sendLovableEmail } from '@lovable.dev/email-js';
import { renderAuthEmail } from './auth-template';

type Action = 'signup' | 'magiclink' | 'invite' | 'recovery' | 'email_change' | 'reauthentication';
type Payload = { user: { email: string; new_email?: string }; email_data: { email_action_type: Action; token: string; token_new?: string; token_hash: string; token_hash_new?: string } };
const titles: Record<Action, string> = { signup: 'Confirm your RELAY account', magiclink: 'Your RELAY sign-in code', invite: 'Your RELAY invitation', recovery: 'Recover your RELAY account', email_change: 'Confirm your RELAY email address', reauthentication: 'Your RELAY verification code' };

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
  const html = renderAuthEmail({ action, code: message.token, url: showLink ? url.href : undefined });
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

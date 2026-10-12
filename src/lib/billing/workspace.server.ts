import { createClient } from '@supabase/supabase-js';
import { paddleConfig, createBillingCustomer, createBillingTransaction, createSandboxPortal, readBillingTransaction, readBillingSubscription, readPaddleEvent } from './paddle.server';
import { isPaidPlan, isBillingCycle } from './plans';

const projectUrl = 'https://aadbcovypefhlpsmoinn.supabase.co';
const publicKey = 'sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const response = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function serviceClient() {
  const secret = process.env.RELAY_SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Billing server is not configured.');
  return createClient(projectUrl, secret, options);
}
async function service(action: string, payload: object) {
  const result = await serviceClient().rpc('relay_billing_service', { action, payload });
  if (result.error) throw new Error(result.error.code === '42501' ? 'Only an owner or administrator can manage billing.' : 'The company billing operation could not be completed.');
  return result.data as Record<string, unknown>;
}
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 2048) { await reader.cancel(); throw new Error('Request too large.'); }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export async function workspaceBilling(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Origin denied.' }, 403);
  const bearer = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!bearer) return response({ error: 'Sign in to your company workspace.' }, 401);
  let body: Record<string, unknown>;
  try { body = await readBody(request); } catch { return response({ error: 'Invalid billing request.' }, 400); }
  const action = body.action;
  if (!['status', 'checkout', 'portal', 'resume'].includes(String(action))) return response({ error: 'Invalid billing action.' }, 400);
  const authClient = createClient(projectUrl, publicKey, { ...options, global: { headers: { Authorization: `Bearer ${bearer}` } } });
  const { data, error } = await authClient.auth.getUser(bearer);
  if (error || !data.user) return response({ error: 'Please sign in again.' }, 401);
  const environment = process.env.PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
  const org = body.organization_id;
  if (action !== 'resume' && (typeof org !== 'string' || !uuid.test(org))) return response({ error: 'Choose your company workspace.' }, 400);
  try {
    if (action === 'status') {
      const result = await authClient.rpc('relay_billing_snapshot', { org, env: environment });
      if (result.error) return response({ error: result.error.code === '42501' ? 'Company access denied.' : 'Billing information is temporarily unavailable.' }, result.error.code === '42501' ? 403 : 503);
      let configured = false;
      try { paddleConfig(); configured = !!process.env.RELAY_SUPABASE_SECRET_KEY; } catch { /* No purchase button before provider activation. */ }
      const termsVersion = process.env.RELAY_BILLING_TERMS_VERSION || null;
      if (environment === 'production' && (!termsVersion || process.env.RELAY_BILLING_LAUNCH_APPROVED !== 'true')) configured = false;
      return response({ ...result.data, configured, environment, terms_version: termsVersion });
    }
    const config = paddleConfig();
    if(environment === 'production' && process.env.RELAY_BILLING_LAUNCH_APPROVED !== 'true') return response({ error: 'Paid plans are not open yet.' }, 503);
    if (action === 'resume') {
      if (typeof body.transaction_id !== 'string' || !/^txn_[a-z0-9]{26}$/.test(body.transaction_id)) return response({ error: 'Invalid checkout.' }, 400);
      const session = await service('resume', { environment, actor_id: data.user.id, transaction_id: body.transaction_id });
      return response({ transactionId: body.transaction_id, organizationId: session.organization_id, environment, clientToken: config.clientToken });
    }
    const context = { environment, organization_id: org, actor_id: data.user.id };
    if (action === 'portal') {
      const mapping = await service('portal', context);
      const portalUrl = await createSandboxPortal(config, String(mapping.customer_id), String(mapping.subscription_id));
      return response({ portalUrl });
    }
    if (!isPaidPlan(body.plan) || !isBillingCycle(body.cycle) || typeof body.billing_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.billing_email) || body.billing_email.length > 254 || body.business_confirmed !== true) return response({ error: 'Check your company billing details and business confirmation.' }, 400);
    // Production needs final, published terms. A sandbox check is not legal acceptance for a live order.
    if (environment === 'production' && (!process.env.RELAY_BILLING_TERMS_VERSION || body.terms_version !== process.env.RELAY_BILLING_TERMS_VERSION)) return response({ error: 'Review the current billing terms before continuing.' }, 409);
    const attempt = await service('begin', { ...context, plan: body.plan, cycle: body.cycle, billing_email: body.billing_email, terms_version: environment === 'sandbox' ? 'sandbox-no-live-order' : body.terms_version });
    if (!attempt.created) {
      if (attempt.state !== 'ready' || !attempt.transaction_id) return response({ error: 'Your previous checkout needs review. No second order has been created.', code: 'checkout_pending' }, 409);
      const transaction = await readBillingTransaction(config, String(attempt.transaction_id));
      if (transaction.customer_id !== attempt.customer_id || !['draft', 'ready'].includes(transaction.status)) return response({ error: 'This checkout is no longer open. Refresh your billing information.' }, 409);
      return response({ transactionId: transaction.id, clientToken: config.clientToken, environment });
    }
    try {
      let customerId = attempt.customer_id as string | null;
      if (!customerId) {
        const company = await authClient.from('organizations').select('legal_name').eq('id', org).single();
        if (company.error || !company.data) throw new Error('Company access denied.');
        customerId = await createBillingCustomer(config, String(org), body.billing_email.toLowerCase(), company.data.legal_name);
        await service('customer', { ...context, attempt_id: attempt.id, customer_id: customerId });
      }
      const transaction = await createBillingTransaction(config, { organizationId: String(org), checkoutAttemptId: String(attempt.id), customerId, plan: body.plan, cycle: body.cycle });
      await service('transaction', { ...context, attempt_id: attempt.id, transaction_id: transaction.transactionId });
      return response({ transactionId: transaction.transactionId, clientToken: config.clientToken, environment });
    } catch {
      // Ambiguous network failures remain blocked until reconciled; never auto-create a second payable order.
      await service('uncertain', { ...context, attempt_id: attempt.id }).catch(() => undefined);
      return response({ error: 'Checkout could not be opened. Your order needs review before retrying; no second order will be created.', code: 'checkout_pending' }, 503);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : '';
    if (text.includes('owner or administrator')) return response({ error: text }, 403);
    return response({ error: 'Billing is not available yet. Your company workspace remains accessible.' }, 503);
  }
}

export async function paddleWebhook(request: Request) {
  let config: ReturnType<typeof paddleConfig>;
  try { config = paddleConfig(); serviceClient(); } catch { return response({ error: 'Billing is not configured.' }, 503); }
  let event;
  try { event = await readPaddleEvent(request, config.webhookSecret); } catch { return response({ error: 'Invalid webhook.' }, 400); }
  if (!event.event_type.startsWith('subscription.') && event.event_type !== 'transaction.completed') return response({ ignored: true });
  try {
    let transactionId: string | null = null;
    let subscriptionId = String(event.data.id || '');
    if (event.event_type === 'transaction.completed') {
      const transaction = await readBillingTransaction(config, subscriptionId);
      if (transaction.status !== 'completed' || !transaction.subscription_id) return response({ ignored: true });
      transactionId = transaction.id; subscriptionId = transaction.subscription_id;
    }
    const sub = await readBillingSubscription(config, subscriptionId);
    const attemptId = sub.custom_data?.relay_checkout_attempt;
    // Look up the recorded transaction by attempt on the trusted server. The browser never chooses its company mapping.
    const binding = await service('event_binding', { environment: config.environment, customer_id: sub.customer_id, subscription_id: sub.id, attempt_id: attemptId });
    if (binding.ignored) return response({ ignored: true });
    if (transactionId && transactionId !== binding.transaction_id) throw new Error('Transaction binding mismatch.');
    const original = await readBillingTransaction(config, String(binding.transaction_id));
    if(original.status!=='completed' || original.subscription_id!==sub.id || original.customer_id!==sub.customer_id || original.custom_data?.relay_checkout_attempt!==attemptId) throw new Error('The subscription does not belong to the recorded, completed company order.');
    const result = await service('apply', {
      environment: config.environment, event_id: event.event_id, occurred_at: event.occurred_at,
      provider_updated_at: sub.updated_at, customer_id: sub.customer_id, subscription_id: sub.id,
      attempt_id: attemptId, transaction_id: binding.transaction_id,
      plan: sub.plan, cycle: sub.cycle, status: sub.status,
      period_end: sub.current_billing_period?.ends_at || null,
      cancel_at: sub.scheduled_change?.action === 'cancel' ? sub.scheduled_change.effective_at : null,
    });
    return response(result);
  } catch { return response({ error: 'Subscription update will be retried.' }, 503); }
}

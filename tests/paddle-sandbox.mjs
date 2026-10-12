import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { sandboxPaddleConfig, verifyPaddleSignature, readPaddleEvent, createSandboxTransaction, createSandboxPortal } from '../src/lib/billing/paddle.server.ts';

const id = prefix => `${prefix}_${'a'.repeat(26)}`;
const secret = 'test-not-a-real-webhook-secret';
const now = Math.floor(Date.now() / 1000);
const event = { event_id: id('evt'), event_type: 'subscription.activated', occurred_at: new Date().toISOString(), data: { id: id('sub') } };
const raw = Buffer.from(JSON.stringify(event));
const signature = (body = raw, time = now, key = secret) => `ts=${time};h1=${createHmac('sha256', key).update(`${time}:`).update(body).digest('hex')}`;

assert.equal(verifyPaddleSignature(raw, signature(), secret, now), true);
assert.equal(verifyPaddleSignature(raw, `ts=${now};h1=${'0'.repeat(64)};${signature().split(';')[1]}`, secret, now), true);
for (const header of [null, signature(raw, now - 6), signature(raw, now + 6), signature(raw, now, 'wrong-secret'), `ts=${now};${signature()}`, `ts=${now};h1=abc`]) {
  assert.equal(verifyPaddleSignature(raw, header, secret, now), false);
}
assert.equal(verifyPaddleSignature(Buffer.concat([raw, Buffer.from(' ')]), signature(), secret, now), false);
const request = (body, header) => new Request('https://example.invalid/webhook', { method: 'POST', headers: header ? { 'Paddle-Signature': header } : {}, body });
assert.deepEqual(await readPaddleEvent(request(raw, signature()), secret), event);
await assert.rejects(readPaddleEvent(request(raw, null), secret), /signature/);
const invalid = Buffer.from(JSON.stringify({ ...event, data: [] }));
await assert.rejects(readPaddleEvent(request(invalid, signature(invalid)), secret), /event/);
const oversize = Buffer.alloc(256 * 1024 + 1);
await assert.rejects(readPaddleEvent(request(oversize, signature(oversize)), secret), /large/);

const env = { RELAY_PADDLE_SANDBOX_ENABLED: 'true', PADDLE_ENVIRONMENT: 'sandbox', PADDLE_API_KEY: 'pdl_sdbx_apikey_test-only', PADDLE_WEBHOOK_SECRET: secret, PADDLE_CORE_MONTHLY_PRICE_ID: id('pri'), PADDLE_PRO_MONTHLY_PRICE_ID: `pri_${'b'.repeat(26)}` };
assert.throws(() => sandboxPaddleConfig({}), /not enabled/);
assert.throws(() => sandboxPaddleConfig({ ...env, PADDLE_ENVIRONMENT: 'production' }), /Live billing/);
assert.throws(() => sandboxPaddleConfig({ ...env, PADDLE_API_KEY: '' }), /incomplete/);
assert.throws(() => sandboxPaddleConfig({ ...env, PADDLE_API_KEY: 'pdl_live_apikey_test-only' }), /incomplete/);
const config = sandboxPaddleConfig(env);
const input = { organizationId: '11111111-1111-1111-1111-111111111111', checkoutAttemptId: '22222222-2222-2222-2222-222222222222', customerId: id('ctm'), plan: 'core' };
const calls = [];
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
    return Response.json({ data: { id: id('txn'), customer_id: id('ctm'), checkout: { url: `https://relay.vovere-studios.com/pay?_ptxn=${id('txn')}` } } });
  };
  const transaction = await createSandboxTransaction(config, input);
  assert.equal(transaction.transactionId, id('txn'));
  assert.equal(calls[0].url, 'https://sandbox-api.paddle.com/transactions');
  assert.deepEqual(calls[0].body.items, [{ price_id: env.PADDLE_CORE_MONTHLY_PRICE_ID, quantity: 1 }]);
  assert.deepEqual(calls[0].body.custom_data, { relay_workspace_id: input.organizationId, relay_checkout_attempt: input.checkoutAttemptId });
  await assert.rejects(createSandboxTransaction(config, { ...input, plan: 'browser-supplied-price' }), /Invalid/);
  assert.equal(calls.length, 1);
  globalThis.fetch = async () => Response.json({ data: { id: id('txn'), customer_id: `ctm_${'b'.repeat(26)}`, checkout: { url: 'https://example.invalid' } } });
  await assert.rejects(createSandboxTransaction(config, input), /not ready/);
  globalThis.fetch = async () => Response.json({ error: { detail: 'Secret must not appear in exception' } }, { status: 401 });
  await assert.rejects(createSandboxTransaction(config, input), /^Error: Paddle sandbox request failed \(401\)\.$/);
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return Response.json({ data: { customer_id: id('ctm'), urls: { general: { overview: 'https://sandbox-customer-portal.paddle.com/test?token=test-only' } } } });
  };
  assert.equal(await createSandboxPortal(config, id('ctm'), id('sub')), 'https://sandbox-customer-portal.paddle.com/test?token=test-only');
  assert.deepEqual(calls.at(-1).body.subscription_ids, [id('sub')]);
  globalThis.fetch = async () => Response.json({ data: { customer_id: id('ctm'), urls: { general: { overview: 'https://customer-portal.paddle.com/live' } } } });
  await assert.rejects(createSandboxPortal(config, id('ctm'), id('sub')), /Invalid/);
} finally { globalThis.fetch = originalFetch; }
console.log('Paddle sandbox preparation passed: signed raw payloads, replay window, payload limits, disabled/live guards, server prices, company mapping payload and portal isolation. No real provider calls or charges.');

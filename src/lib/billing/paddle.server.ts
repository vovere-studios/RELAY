import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingCycle } from './plans';

type PaidPlan = "core" | "pro";
type SandboxConfig = { apiKey: string; webhookSecret: string; prices: Record<PaidPlan, string>; environment?: 'sandbox' | 'production' };
export type PaddleConfig = SandboxConfig & { environment: 'sandbox' | 'production'; clientToken: string; annualPrices: Record<PaidPlan, string> };
const sandboxApi = "https://sandbox-api.paddle.com";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const paddleId = (prefix: string, value: string) => new RegExp(`^${prefix}_[a-z0-9]{26}$`).test(value);

export function paddleConfig(env: Record<string, string | undefined> = process.env): PaddleConfig {
  const environment = env.PADDLE_ENVIRONMENT;
  if (environment !== 'sandbox' && environment !== 'production') throw new Error('Billing is not configured.');
  if (env[environment === 'sandbox' ? 'RELAY_PADDLE_SANDBOX_ENABLED' : 'RELAY_PADDLE_LIVE_ENABLED'] !== 'true') throw new Error('Paid plans are not open yet.');
  const apiKey = env.PADDLE_API_KEY || '', clientToken = env.PADDLE_CLIENT_TOKEN || '', webhookSecret = env.PADDLE_WEBHOOK_SECRET || '';
  const prices = { core: env.PADDLE_CORE_MONTHLY_PRICE_ID || '', pro: env.PADDLE_PRO_MONTHLY_PRICE_ID || '' };
  const annualPrices = { core: env.PADDLE_CORE_ANNUAL_PRICE_ID || '', pro: env.PADDLE_PRO_ANNUAL_PRICE_ID || '' };
  const ids = [...Object.values(prices), ...Object.values(annualPrices)];
  if (!apiKey.startsWith(environment === 'sandbox' ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_') ||
    !clientToken.startsWith(environment === 'sandbox' ? 'test_' : 'live_') || !webhookSecret ||
    ids.some(id => !paddleId('pri', id)) || new Set(ids).size !== 4) throw new Error('Billing configuration is incomplete.');
  return { environment, apiKey, clientToken, webhookSecret, prices, annualPrices };
}

/** Server-only preparation. Live billing is intentionally not supported yet. */
export function sandboxPaddleConfig(env: Record<string, string | undefined> = process.env): SandboxConfig {
  if (env.RELAY_PADDLE_SANDBOX_ENABLED !== "true" || env.PADDLE_ENVIRONMENT !== "sandbox") {
    throw new Error("Paddle sandbox is not enabled. Live billing is not available.");
  }
  const apiKey = env.PADDLE_API_KEY;
  const webhookSecret = env.PADDLE_WEBHOOK_SECRET;
  const core = env.PADDLE_CORE_MONTHLY_PRICE_ID || "";
  const pro = env.PADDLE_PRO_MONTHLY_PRICE_ID || "";
  if (!apiKey?.startsWith("pdl_sdbx_apikey_") || !webhookSecret || !paddleId("pri", core) || !paddleId("pri", pro) || core === pro) {
    throw new Error("Paddle sandbox configuration is incomplete.");
  }
  return { apiKey, webhookSecret, prices: { core, pro } };
}

/** Verify the original bytes before decoding or parsing the webhook payload. */
export function verifyPaddleSignature(rawBody: Uint8Array, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!secret || !header || header.length > 4096 || !Number.isSafeInteger(nowSeconds)) return false;
  const parts = header.split(";").map(part => part.trim().split("="));
  const timestamps = parts.filter(([key]) => key === "ts");
  if (timestamps.length !== 1 || timestamps[0].length !== 2 || !/^\d{1,12}$/.test(timestamps[0][1])) return false;
  const timestamp = timestamps[0][1];
  if (Math.abs(nowSeconds - Number(timestamp)) > 5) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}:`).update(rawBody).digest();
  return parts.some(([key, signature, extra]) => key === "h1" && extra === undefined &&
    /^[a-f0-9]{64}$/i.test(signature || "") && timingSafeEqual(expected, Buffer.from(signature, "hex")));
}

export type PaddleEvent = { event_id: string; event_type: string; occurred_at: string; data: Record<string, unknown> };

export async function readPaddleEvent(request: Request, secret: string): Promise<PaddleEvent> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing Paddle payload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 256 * 1024) {
      await reader.cancel();
      throw new Error("Paddle payload is too large.");
    }
    chunks.push(part.value);
  }
  const bytes = Buffer.concat(chunks);
  if (!verifyPaddleSignature(bytes, request.headers.get("Paddle-Signature"), secret)) throw new Error("Invalid Paddle signature.");
  const event = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as Partial<PaddleEvent>;
  if (!event || !paddleId("evt", event.event_id || "") || typeof event.event_type !== "string" ||
      !/^[a-z_]+\.[a-z_]+$/.test(event.event_type) || typeof event.occurred_at !== "string" ||
      !Number.isFinite(Date.parse(event.occurred_at)) || !event.data || typeof event.data !== "object" || Array.isArray(event.data)) {
    throw new Error("Invalid Paddle event.");
  }
  return event as PaddleEvent;
}

async function sandboxRequest<T>(config: SandboxConfig, path: string, payload?: object): Promise<T> {
  // Fixed provider hosts; never use a URL supplied by a browser or webhook.
  const host = config.environment === 'production' ? 'https://api.paddle.com' : sandboxApi;
  const response = await fetch(`${host}${path}`, {
    method: payload ? "POST" : 'GET',
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  // Do not retry a transaction automatically after an ambiguous network failure.
  if (!response.ok) throw new Error(`Paddle ${config.environment === 'production' ? 'production' : 'sandbox'} request failed (${response.status}).`);
  const result = await response.json() as { data?: T };
  if (!result.data) throw new Error("Paddle sandbox returned an incomplete response.");
  return result.data;
}

/** Caller must authorize the workspace and persist this attempt before invoking. */
export async function createSandboxTransaction(config: SandboxConfig, input: { organizationId: string; checkoutAttemptId: string; customerId: string; plan: PaidPlan }) {
  if (!uuid.test(input.organizationId) || !uuid.test(input.checkoutAttemptId) || !paddleId("ctm", input.customerId) ||
      !["core", "pro"].includes(input.plan) || !paddleId("pri", config.prices[input.plan])) throw new Error("Invalid company checkout.");
  const result = await sandboxRequest<{ id: string; customer_id: string; checkout: { url: string | null } | null }>(config, "/transactions", {
    items: [{ price_id: config.prices[input.plan], quantity: 1 }],
    customer_id: input.customerId,
    collection_mode: "automatic",
    custom_data: { relay_workspace_id: input.organizationId, relay_checkout_attempt: input.checkoutAttemptId },
  });
  if (!paddleId("txn", result.id) || result.customer_id !== input.customerId || !result.checkout?.url) throw new Error("Paddle checkout is not ready.");
  const checkout = new URL(result.checkout.url);
  if (checkout.protocol !== "https:" || checkout.username || checkout.password) throw new Error("Invalid Paddle checkout URL.");
  return { transactionId: result.id, checkoutUrl: checkout.href };
}

/** Customer/subscription IDs must come from the server's authorized workspace mapping. */
export async function createSandboxPortal(config: SandboxConfig, customerId: string, subscriptionId: string) {
  if (!paddleId("ctm", customerId) || !paddleId("sub", subscriptionId)) throw new Error("Invalid company subscription.");
  const result = await sandboxRequest<{ customer_id: string; urls: { general: { overview: string } } }>(config, `/customers/${customerId}/portal-sessions`, { subscription_ids: [subscriptionId] });
  const link = new URL(result.urls.general.overview);
  if (result.customer_id !== customerId || link.protocol !== "https:" || link.hostname !== (config.environment === 'production' ? 'customer-portal.paddle.com' : "sandbox-customer-portal.paddle.com") || link.username || link.password) {
    throw new Error("Invalid Paddle sandbox portal.");
  }
  // Temporary authenticated portal URLs must not be stored or logged.
  return link.href;
}

export async function createBillingCustomer(config: PaddleConfig, organizationId: string, email: string, name: string) {
  if (!uuid.test(organizationId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 160) throw new Error('Invalid billing identity.');
  // Never claim an existing customer from its email: it may belong to another company.
  const customer = await sandboxRequest<{ id: string; email: string; custom_data: { relay_workspace_id?: string } }>(config, '/customers', { email, name, custom_data: { relay_workspace_id: organizationId } });
  if (!paddleId('ctm', customer.id) || customer.email.toLowerCase() !== email.toLowerCase() || customer.custom_data?.relay_workspace_id !== organizationId) throw new Error('Invalid company customer.');
  return customer.id;
}

export async function createBillingTransaction(config: PaddleConfig, input: { organizationId: string; checkoutAttemptId: string; customerId: string; plan: PaidPlan; cycle: BillingCycle }) {
  if (input.cycle !== 'month' && input.cycle !== 'year') throw new Error('Invalid billing frequency.');
  return createSandboxTransaction({ ...config, prices: input.cycle === 'year' ? config.annualPrices : config.prices }, input);
}

export async function readBillingTransaction(config: PaddleConfig, transactionId: string) {
  if (!paddleId('txn', transactionId)) throw new Error('Invalid transaction.');
  return sandboxRequest<{ id: string; customer_id: string; subscription_id: string | null; status: string; custom_data: Record<string, unknown> | null }>(config, `/transactions/${transactionId}`);
}

/** Retrieve current provider state; old webhook deliveries cannot overwrite newer state. */
export async function readBillingSubscription(config: PaddleConfig, subscriptionId: string) {
  if (!paddleId('sub', subscriptionId)) throw new Error('Invalid subscription.');
  const sub = await sandboxRequest<{
    id: string; customer_id: string; status: string; updated_at: string; custom_data: Record<string, unknown> | null;
    current_billing_period: { ends_at: string } | null; scheduled_change: { action: string; effective_at: string } | null;
    items: { quantity: number; price: { id: string; unit_price: { amount: string; currency_code: string }; billing_cycle: { interval: string; frequency: number } | null } }[];
  }>(config, `/subscriptions/${subscriptionId}`);
  if (sub.id !== subscriptionId || !paddleId('ctm', sub.customer_id) || !Number.isFinite(Date.parse(sub.updated_at)) || !['active', 'trialing', 'past_due', 'paused', 'canceled'].includes(sub.status) || !Array.isArray(sub.items) || sub.items.length !== 1 || sub.items[0].quantity !== 1) throw new Error('Invalid company subscription.');
  const price = sub.items[0].price;
  const plan = (['core', 'pro'] as const).find(value => config.prices[value] === price.id || config.annualPrices[value] === price.id);
  const cycle = plan && config.annualPrices[plan] === price.id ? 'year' : 'month';
  const amount = plan === 'core' ? (cycle === 'year' ? '29000' : '2900') : (cycle === 'year' ? '79000' : '7900');
  if (!plan || price.unit_price.currency_code !== 'EUR' || price.unit_price.amount !== amount || price.billing_cycle?.interval !== cycle || price.billing_cycle.frequency !== 1) throw new Error('Subscription price does not match a Relay plan.');
  return { ...sub, plan, cycle };
}

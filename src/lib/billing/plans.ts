export type PlanId = 'free' | 'core' | 'pro';
export type PaidPlan = Exclude<PlanId, 'free'>;
export type BillingCycle = 'month' | 'year';

/** One subscription belongs to one company, not to an individual employee. */
export const plans = [
  { id: 'free', name: 'Free', description: 'A clearer starting point.', monthly: 0, annual: 0,
    documents: 20, storageBytes: 50_000_000, storage: '50 MB', seats: 1, suppliers: 5,
    detail: 'For one person bringing their company information together.' },
  { id: 'core', name: 'Core', description: 'Your team, connected.', monthly: 29, annual: 290,
    documents: 500, storageBytes: 1_000_000_000, storage: '1 GB', seats: 5, suppliers: 50,
    detail: 'For teams building a dependable supplier network.' },
  { id: 'pro', name: 'Pro', description: 'More room to move.', monthly: 79, annual: 790,
    documents: 5000, storageBytes: 10_000_000_000, storage: '10 GB', seats: 15, suppliers: 250,
    detail: 'For companies managing a larger network and document library.' },
] as const;
export const planById = (id: PlanId) => plans.find(plan => plan.id === id)!;
export const isPaidPlan = (value: unknown): value is PaidPlan => value === 'core' || value === 'pro';
export const isBillingCycle = (value: unknown): value is BillingCycle => value === 'month' || value === 'year';
export function billingDestination(plan?: PaidPlan, cycle: BillingCycle = 'month') {
  return `/cloud?view=settings&section=Billing${plan ? `&plan=${plan}&cycle=${cycle}` : ''}`;
}
export function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toLocaleString('en', { maximumFractionDigits: 2 })} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toLocaleString('en', { maximumFractionDigits: 1 })} MB`;
  return `${Math.ceil(bytes / 1000).toLocaleString('en')} KB`;
}

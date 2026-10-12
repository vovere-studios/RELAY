import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { MotionValue } from './Motion';
import { plans, billingDestination, type BillingCycle, type PaidPlan, type PlanId } from '../lib/billing/plans';

export function PlanCards({ cycle, current, selected, onChoose, disabled = false }: {
  cycle: BillingCycle; current?: PlanId; selected?: PaidPlan | null; onChoose?: (plan: PaidPlan) => void; disabled?: boolean;
}) {
  return <div className="plan-grid">{plans.map(plan => <article key={plan.id} className="plan-card" data-plan={plan.id} data-selected={selected === plan.id || undefined}>
    <div className="plan-card-top"><h3>{plan.name}</h3>{current === plan.id ? <span className="plan-tag">Current plan</span> : plan.id === 'core' ? <span className="plan-tag">For your team</span> : null}</div>
    <p className="plan-description">{plan.description}</p>
    <div className="plan-price"><MotionValue>{`€${plan.id === 'free' ? 0 : cycle === 'year' ? plan.annual : plan.monthly}`}</MotionValue><small>/{cycle === 'year' && plan.id !== 'free' ? 'year' : 'month'}</small></div>
    <p className="plan-price-note">{plan.id === 'free' ? 'No card needed.' : cycle === 'year' ? 'One yearly payment. Two months included.' : 'Billed monthly. Cancel for the next renewal.'}</p>
    <p className="plan-detail">{plan.detail}</p>
    <dl className="plan-capacities"><div><dt>Active documents</dt><dd>{plan.documents.toLocaleString('en')}</dd></div><div><dt>File storage</dt><dd>{plan.storage}</dd></div><div><dt>Team members</dt><dd>{plan.seats}</dd></div><div><dt>Suppliers</dt><dd>{plan.suppliers}</dd></div></dl>
    {onChoose ? plan.id === 'free' ? <span className="plan-current-note">{!current ? 'Checking your current plan…' : current === 'free' ? 'Your starting plan' : 'Manage cancellation in billing'}</span>
      : <button className={`button ${plan.id === 'core' ? 'button-primary' : 'button-secondary'}`} aria-expanded={selected === plan.id} aria-controls={selected === plan.id ? 'billing-order-review' : undefined} disabled={disabled || current === plan.id} onClick={() => onChoose(plan.id as PaidPlan)}>{current === plan.id ? 'Current plan' : `Choose ${plan.name}`}<ArrowUpRight size={16}/></button>
      : <Link className={`button ${plan.id === 'core' ? 'button-primary' : 'button-secondary'}`} to={plan.id === 'free' ? '/signup' : `/signup?next=${encodeURIComponent(billingDestination(plan.id as PaidPlan, cycle))}`}>{plan.id === 'free' ? 'Start with Free' : `Choose ${plan.name}`}<ArrowUpRight size={16}/></Link>}
  </article>)}</div>;
}

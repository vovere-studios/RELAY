import { InlineError } from './InlineError';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Files, ArrowUpRight, Building2, Inbox, Activity } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage } from '../lib/cloud-api';
import { LoadingIndicator } from './ui';
import { SegmentedControl } from './SegmentedControl';
import { CompanyExchange } from './CompanyExchange';
import { Select } from './Select';
import { MotionPanel } from './Motion';

type Task = { id: string; title: string; detail: string; href: string; kind: 'expiry' | 'review' | 'request' | 'information'; urgent: boolean; order: string };
type Event = { id: string; title: string; detail: string; created_at: string };
const icons = { expiry: CalendarClock, review: Files, request: ArrowUpRight, information: Building2 };
const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function WorkspaceInbox({ organizationId, manager, events, revision, compact = false }: {
  organizationId: string; manager: boolean; events: Event[]; revision: number; compact?: boolean;
}) {
  const [section, setSection] = useState('To do');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [days, setDays] = useState('30');
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError('');
    const today = day(new Date()); const until = new Date(); until.setDate(until.getDate()+Number(days));
    const client = requireSupabase();
    void Promise.all([
      client.from('certificates').select('id,supplier_id,standard,valid_until').eq('organization_id', organizationId).lte('valid_until', day(until)).order('valid_until').limit(30).abortSignal(controller.signal),
      client.from('documents').select('id,name,supplier_id,uploaded_at').eq('organization_id', organizationId).eq('verification_status', 'unverified').order('uploaded_at', { ascending: false }).limit(30).abortSignal(controller.signal),
      client.from('data_requests').select('id,title,due_at').eq('organization_id', organizationId).eq('status', 'open').order('due_at').limit(30).abortSignal(controller.signal),
      client.from('relationship_health').select('supplier_id,missing_requirements').eq('organization_id', organizationId).gt('missing_requirements',0).order('completeness').limit(30).abortSignal(controller.signal),
    ]).then(async rows => {
      if (!current) return;
      const failure = rows.find(row => row.error)?.error; if (failure) throw failure;
      const ids=(rows[3].data||[]).map(row=>row.supplier_id).filter((id):id is string=>!!id);
      const names=new Map<string,string>();
      if(ids.length){const suppliers=await client.from('suppliers').select('id,legal_name').eq('organization_id',organizationId).in('id',ids).limit(30).abortSignal(controller.signal);if(suppliers.error)throw suppliers.error;suppliers.data?.forEach(row=>names.set(row.id,row.legal_name));}
      if(!current)return;
      const base = `/cloud?org=${organizationId}`;
      setTasks([
        ...(rows[0].data || []).map(row => ({ id: `expiry-${row.id}`, kind: 'expiry' as const, urgent: row.valid_until < today, order: row.valid_until, title: row.standard, detail: `${row.valid_until < today ? 'Expired' : 'Expires'} ${dateLabel(row.valid_until)}`, href: `${base}&view=suppliers&supplier=${row.supplier_id}&tab=Certificates` })),
        ...(rows[1].data || []).map(row => ({ id: `review-${row.id}`, kind: 'review' as const, urgent: false, order: row.uploaded_at, title: row.name, detail: manager ? 'Ready for your review' : 'Awaiting an administrator’s review', href: `${base}&view=documents&document=${row.id}` })),
        ...(rows[2].data || []).map(row => ({ id: `request-${row.id}`, kind: 'request' as const, urgent: row.due_at < today, order: row.due_at, title: row.title, detail: `${row.due_at < today ? 'Overdue' : 'Awaiting response'} · Due ${dateLabel(row.due_at)}`, href: `${base}&view=requests&focus=${row.id}` })),
        ...(rows[3].data || []).filter(row => (row.missing_requirements || 0) > 0).map(row => ({ id: `information-${row.supplier_id}`, kind: 'information' as const, urgent: false, order: '9999', title: names.get(row.supplier_id||'')||'Complete supplier information', detail: `${row.missing_requirements} requirements to resolve`, href: `${base}&view=suppliers&supplier=${row.supplier_id}&tab=Requirements` })),
      ].sort((a,b) => Number(b.urgent)-Number(a.urgent) || a.order.localeCompare(b.order)));
    }).catch(failure => { if (current) setError(controller.signal.aborted ? 'The connection took too long. Your tasks have not changed.' : errorMessage(failure)); })
      .finally(() => { clearTimeout(timeout); if (current) setLoading(false); });
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [organizationId, manager, revision, retry, days]);
  return <section className={`workspace-inbox ${compact ? 'inbox-compact' : ''}`} aria-busy={loading}>
    <div className="inbox-heading"><div><p className="eyebrow">YOUR NEXT STEPS</p><h2>{compact ? 'A few things to move forward.' : 'Ready for your attention.'}</h2><p>Work that needs a decision, connected to its source.</p></div>{compact ? <Link to={`/cloud?view=inbox&org=${organizationId}`} className="text-link">Open inbox<ArrowRight size={15}/></Link> : <label className="inbox-horizon">Expiry horizon<Select value={days} onChange={event=>setDays(event.target.value)}><option value="7">Next 7 days</option><option value="14">Next 14 days</option><option value="30">Next 30 days</option><option value="60">Next 60 days</option></Select></label>}</div>
    {!compact && <SegmentedControl value={section} options={['To do','Company requests','Updates'].map(value=>({value,label:value}))} onChange={setSection} label="Inbox section" className="inbox-sections"/>}
    <MotionPanel identity={section} compact>
    {section === 'To do' && <>
      {loading && <LoadingIndicator compact label={tasks.length ? 'Updating your next steps…' : 'Finding your next steps…'}/>}
      {error && <InlineError message={error} onRetry={()=>setRetry(value=>value+1)}/>}
      <div className="inbox-tasks">{tasks.slice(0, compact ? 4 : 120).map(task => { const Icon=icons[task.kind]; return <Link key={task.id} to={task.href} className="inbox-task" data-urgent={task.urgent}><span className="inbox-task-icon"><Icon size={19} strokeWidth={1.6}/></span><span className="inbox-task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span>{task.urgent&&<span className="inbox-urgency">Needs attention</span>}<ArrowRight size={16} className="inbox-task-arrow"/></Link>; })}</div>
      {!loading && !error && !tasks.length && <div className="inbox-clear"><Inbox size={28} strokeWidth={1.3}/><h3>Room to focus.</h3><p>There are no recorded tasks in this view.</p><Link to={`/cloud?view=documents&org=${organizationId}`}>Review your documents<ArrowRight size={14}/></Link></div>}
      {!compact && tasks.length>=30 && <p className="quiet-note">Up to 30 items per category. Open the source section to explore all records.</p>}
    </>}
    {section === 'Company requests' && <CompanyExchange organizationId={organizationId} manager={manager} revision={revision}/>}
    {section === 'Updates' && <div className="inbox-updates">{events.map(event=><article key={event.id}><span><Activity size={16}/></span><div><strong>{event.title}</strong><p>{event.detail}</p><time dateTime={event.created_at}>{dateLabel(event.created_at)}</time></div></article>)}{!events.length&&<p className="quiet-note">Your company activity will appear here.</p>}<Link className="text-link" to={`/cloud?view=activity&org=${organizationId}`}>Full activity history<ArrowRight size={15}/></Link></div>}
    </MotionPanel>
  </section>;
}

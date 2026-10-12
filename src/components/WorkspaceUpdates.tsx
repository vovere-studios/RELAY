import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, FileText, Send, Users, Trash2, ShieldCheck, Bell, ClipboardList } from 'lucide-react';
import type { Row } from '../lib/cloud-api';
export type WorkspaceUpdate = Row<'workspace_events'> & {
  target_type?: string | null; target_id?: string | null; supplier_id?: string | null;
  supplier_name?: string | null; actor_name?: string | null; supplier_available?: boolean;
};
const calendarDay = (date: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
function groupLabel(date: Date) {
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  return calendarDay(date) === calendarDay(today) ? 'Today' : calendarDay(date) === calendarDay(yesterday) ? 'Yesterday' : calendarDay(date);
}
function updateContext(event: WorkspaceUpdate, organizationId: string) {
  const title = event.title.toLowerCase();
  const kind = event.target_type || (title.includes('request') ? 'request' : title.includes('requirement') ? 'requirement' : title.includes('document') || title.includes('certificate') ? 'document' : title.includes('team') || title.includes('invitation') ? 'team' : 'supplier');
  const removed = title.includes('trash');
  const Icon = removed ? Trash2 : title.includes('review') || title.includes('reject') ? ShieldCheck : kind === 'requirement' ? ClipboardList : kind === 'document' ? FileText : kind === 'request' ? Send : kind === 'team' ? Users : Building2;
  const base = `/cloud?org=${organizationId}`;
  let href = `${base}&view=${kind === 'team' ? 'team' : kind === 'request' ? 'requests' : kind === 'supplier' || kind === 'requirement' ? 'suppliers' : 'documents'}`;
  let label = kind === 'team' ? 'View team' : kind === 'request' ? 'View requests' : kind === 'supplier' || kind === 'requirement' ? 'View suppliers' : 'View documents';
  if (kind==='document' && title.includes('supplier') && !event.supplier_id) { href=`${base}&view=suppliers`;label='View suppliers'; }
  if (event.supplier_id && event.supplier_available === false && kind === 'document') { href=`${base}&view=suppliers`;label='View suppliers'; }
  if (event.supplier_id && event.supplier_available !== false) { href = `${base}&view=suppliers&supplier=${event.supplier_id}&tab=${kind === 'requirement' ? 'Requirements' : kind === 'document' ? 'Documents' : 'Company'}`; label = 'Open supplier'; }
  if (event.target_id && kind === 'document' && !removed && event.supplier_available !== false) { href += `&document=${event.target_id}`; label = 'Open document'; }
  if (event.target_id && kind === 'request') { href += `&focus=${event.target_id}`; label = 'Open request'; }
  return { Icon, href, label, kind };
}
export function WorkspaceUpdates({ events, organizationId, compact = false, onNavigate }: { events: WorkspaceUpdate[]; organizationId: string; compact?: boolean; onNavigate?: () => void }) {
  const groups = new Map<string, WorkspaceUpdate[]>();
  for (const event of events) { const key = groupLabel(new Date(event.created_at)); groups.set(key, [...(groups.get(key) || []), event]); }
  return <div className={`workspace-update-feed ${compact ? 'is-compact' : ''}`}>
    {!events.length && <div className="updates-empty"><Bell size={26} /><h3>You’re up to date.</h3><p>Document reviews, supplier submissions and team changes will appear here.</p></div>}
    {[...groups].map(([day, rows]) => <section className="update-day" key={day}><h3>{day}</h3><div>{rows.map(event => {
      const { Icon, href, label, kind } = updateContext(event, organizationId);
      return <article className="update-entry" key={event.id}>
        <span className="update-symbol" aria-hidden="true"><Icon size={19} /></span>
        <div className="update-entry-copy"><div className="update-entry-top"><span className="update-category">{kind === 'requirement' ? 'Requirement' : kind === 'team' ? 'Team' : kind === 'request' ? 'Request' : kind === 'document' ? 'Document' : 'Supplier'}</span><time dateTime={event.created_at} title={new Date(event.created_at).toLocaleString()}>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.created_at))}</time></div>
          <h4>{event.title}</h4>
          {event.supplier_name && <strong className="update-supplier">{event.supplier_name}</strong>}
          {event.detail && <p>{event.detail}</p>}
          {event.actor_name && <small className="update-actor">By {event.actor_name}</small>}
          <Link className="update-destination" to={href} onClick={onNavigate}>{label}<ArrowUpRight size={14} /></Link>
        </div>
      </article>;
    })}</div></section>)}
  </div>;
}

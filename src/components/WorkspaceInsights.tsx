import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage } from '../lib/cloud-api';
import { LoadingIndicator } from './ui';
type Expiry={id:string;supplier_id:string;standard:string;valid_until:string};
const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function WorkspaceInsights({organizationId,suppliers,complete,health,expiry}:{organizationId:string;suppliers:number;complete:number;health:boolean;expiry:boolean}) {
 const [missing,setMissing]=useState<number|null>(null);const [expiring,setExpiring]=useState<Expiry[]>([]);const [expiryCount,setExpiryCount]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!health&&!expiry)return;
  let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  setLoading(true);setError('');const until=new Date();until.setDate(until.getDate()+30);const client=requireSupabase();
  void Promise.all([
   health?client.from('requirements').select('id',{head:true,count:'exact'}).eq('organization_id',organizationId).eq('status','missing').abortSignal(controller.signal):Promise.resolve(null),
   expiry?client.from('certificates').select('id,supplier_id,standard,valid_until',{count:'exact'}).eq('organization_id',organizationId).lte('valid_until',localDay(until)).order('valid_until').limit(5).abortSignal(controller.signal):Promise.resolve(null)
  ]).then(([requirements,certificates])=>{
   if(!active)return;
   if(requirements?.error||certificates?.error)throw requirements?.error||certificates?.error;
   if(requirements)setMissing(requirements.count||0);
   if(certificates){setExpiring(certificates.data||[]);setExpiryCount(certificates.count||0);}
  }).catch(e=>{if(active)setError(controller.signal.aborted?'The connection took too long. Please try again.':errorMessage(e));}).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);});
  return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[organizationId,health,expiry,revision,suppliers,complete]);
 if(!health&&!expiry)return null;
 const percentage=suppliers?Math.round(complete/suppliers*100):0;
 return <div className={`workspace-insights ${health&&expiry?'':'is-single'}`}>
 {health&&<section className="network-health-widget"><div className="widget-heading"><span className="eyebrow">NETWORK HEALTH</span><Link to={`/cloud?view=suppliers&org=${organizationId}`} aria-label="Review network health"><ArrowUpRight size={18}/></Link></div><div className="network-health-body"><div className="network-health-ring" role="meter" aria-label="Complete supplier connections" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="51" className="health-ring-track"/><circle cx="60" cy="60" r="51" className="health-ring-value" pathLength="100" strokeDasharray={`${percentage} 100`} opacity={percentage>0?1:0}/></svg><span>{percentage}<small>%</small></span></div><div><h2>{suppliers?'A clearer picture.':'Your network starts here.'}</h2><p>{complete} of {suppliers} supplier profiles complete.</p><div className="health-inline-count"><b>{loading||missing===null?'—':missing}</b><span>requirements to resolve</span></div></div></div>{error&&!expiry&&<div className="widget-load-error" role="alert"><span>{error}</span><button onClick={()=>setRevision(v=>v+1)}>Retry</button></div>}</section>}
 {expiry&&<section className="expiry-widget"><div className="widget-heading"><span className="eyebrow">DOCUMENT VALIDITY</span><CalendarClock size={18}/></div><h2>Ahead of the deadline.</h2><p>{expiryCount?`${expiryCount} certificates expired or due within 30 days.`:'Your next 30 days, in view.'}</p>{loading?<LoadingIndicator compact label="Checking document validity…"/>:error?<div className="widget-load-error" role="alert"><span>{error}</span><button onClick={()=>setRevision(v=>v+1)}>Retry</button></div>:expiring.length?expiring.map(c=><Link className="expiry-row" to={`/cloud?view=suppliers&org=${organizationId}&supplier=${c.supplier_id}&tab=Certificates`} key={c.id}><span><strong>{c.standard}</strong><small>{dateLabel(c.valid_until)}</small></span><span className="expiry-tag">{c.valid_until<localDay()?'Expired':'Due soon'}<ArrowUpRight size={13}/></span></Link>):<div className="expiry-clear"><span className="expiry-clear-line"/><strong>No upcoming expiries.</strong><small>Recorded certificate dates will appear here.</small></div>}</section>}
 </div>;
}

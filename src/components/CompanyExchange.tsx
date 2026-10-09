import { useEffect, useRef, useState } from 'react';
import { Download, Files, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { ActionButton, OutcomeMark, useActionFeedback } from './ActionFeedback';
import { Button, LoadingIndicator, Badge } from './ui';
import { Select } from './Select';
import { COMPANY_EXCHANGE_ENABLED } from '../lib/feature-activation';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, downloadPrivate, errorMessage } from '../lib/cloud-api';
export type ExchangeRequest = { request_id: string; requester_org: string; recipient_org: string; supplier_id: string; requester_name: string; recipient_name: string; title: string; due_at: string; status: string; submitted_at: string | null; documents: { id:string;name:string;storage_path:string;revoked:boolean }[] };
export async function exchangeApi<T>(action:string,payload:Record<string,string|number|string[]|undefined>={},signal?:AbortSignal) {
  if(!COMPANY_EXCHANGE_ENABLED)throw new Error('Direct company sharing has not been activated yet.');
  const request=requireSupabase().rpc('relay_exchange_api',{action,payload});
  const {data,error}=await (signal?request.abortSignal(signal):request);
  if(error)throw error;
  return data as T;
}
const unavailable=(error:unknown)=>typeof error==='object' && error && 'code' in error && ['PGRST202','42883'].includes(String(error.code));
type Choice={id:string;name:string;kind:string};
export function WorkspaceDocumentPicker({organizationId,onSend,onSent,busy,label='Send selected documents'}:{organizationId:string;onSend:(ids:string[])=>Promise<void>;onSent?:()=>void;busy?:boolean;label?:string}) {
  const [query,setQuery]=useState('');const [docs,setDocs]=useState<Choice[]>([]);const [selected,setSelected]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [page,setPage]=useState(0);
  const feedback=useActionFeedback();
  useEffect(()=>{setSelected({});setQuery('');setPage(0);},[organizationId]);
  useEffect(()=>{let active=true;const controller=new AbortController();setLoading(true);setError('');const timeout=setTimeout(()=>controller.abort(),12000);const timer=setTimeout(()=>void exchangeApi<Choice[]>('documents',{organization_id:organizationId,query,page},controller.signal).then(rows=>{if(active)setDocs(rows);}).catch(e=>{if(active){setDocs([]);setError(controller.signal.aborted?'The connection took too long. Change your search to try again.':unavailable(e)?'Workspace sharing is being activated. You can still upload files below.':errorMessage(e));}}).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);}),180);return()=>{active=false;clearTimeout(timer);clearTimeout(timeout);controller.abort();};},[organizationId,query,page]);
  async function send(){if(!feedback.begin('send'))return;setError('');try{await onSend(Object.keys(selected));feedback.succeed('send',onSent);}catch(e){setError(errorMessage(e));feedback.fail('send');}}
  return <div className="document-picker"><label className="document-picker-search">Find your documents<input type="search" className="input" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Search by document name…"/></label>
    {loading && <LoadingIndicator compact label="Finding your documents…"/>}
    <div className="document-picker-options">{docs.map(d=><label className="document-choice" key={d.id}><input type="checkbox" checked={!!selected[d.id]} disabled={busy||feedback.phase('send')==='pending'||(!selected[d.id]&&Object.keys(selected).length>=20)} onChange={e=>{feedback.reset('send');setSelected(previous=>{const next={...previous};if(e.target.checked)next[d.id]=d.name;else delete next[d.id];return next;});}}/><span className="document-choice-icon"><Files size={18}/></span><span><strong>{d.name}</strong><small>{d.kind}</small></span></label>)}</div>
    {!loading&&!docs.length&&!error&&<p className="quiet-note">No matching documents in this workspace. Upload the file to Documents first, or use the upload form.</p>}
    {(docs.length===50||page>0)&&<div className="picker-pagination"><Button variant="ghost" disabled={!page||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {page+1}</span><Button variant="ghost" disabled={docs.length<50||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></div>}
    {!!Object.keys(selected).length&&<div className="picker-selection"><span>{Object.keys(selected).length} selected</span><p>{Object.values(selected).join(' · ')}</p></div>}
    {error&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}
    <div className="document-send-review"><ShieldCheck size={16}/><p>Only the selected documents are shared. The receiving company can open them until you revoke access in Documents.</p></div>
    <ActionButton label={label} pendingLabel="Sending…" successLabel="Documents sent" phase={feedback.phase('send')} outcomeKey={feedback.version('send')} disabled={busy||!Object.keys(selected).length} onClick={()=>void send()}/>
  </div>;
}
export function CompanyExchange({organizationId,manager,supplierId,revision=0,onUpdated}:{organizationId:string;manager:boolean;supplierId?:string;revision?:number;onUpdated?:()=>void}) {
  const [requests,setRequests]=useState<ExchangeRequest[]>([]);const [direction,setDirection]=useState<'received'|'sent'>('received');
  const [error,setError]=useState('');const [ready,setReady]=useState(COMPANY_EXCHANGE_ENABLED);const [loading,setLoading]=useState(COMPANY_EXCHANGE_ENABLED);const [page,setPage]=useState(0);const [total,setTotal]=useState(0);const [active,setActive]=useState<string|null>(null);const [refresh,setRefresh]=useState(0);const [working,setWorking]=useState(false);const lock=useRef(false);
  useEffect(()=>{setPage(0);setActive(null);setRequests([]);},[organizationId]);
  useEffect(()=>{if(!COMPANY_EXCHANGE_ENABLED)return;let current=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);setLoading(true);setError('');void exchangeApi<{items:ExchangeRequest[];total:number}>('list',{organization_id:organizationId,page,direction:supplierId?'':direction,supplier_id:supplierId},controller.signal).then(r=>{if(current){setRequests(r.items);setTotal(r.total);setReady(true);}}).catch(e=>{if(current){setRequests([]);if(unavailable(e))setReady(false);else setError(controller.signal.aborted?'The connection took too long. Please try again.':errorMessage(e));}}).finally(()=>{clearTimeout(timeout);if(current)setLoading(false);});return()=>{current=false;clearTimeout(timeout);controller.abort();};},[organizationId,page,revision,refresh,direction,supplierId]);
  const filtered=requests.filter(r=>supplierId?r.supplier_id===supplierId:direction==='received'?r.recipient_org===organizationId:r.requester_org===organizationId);
  return <section className="exchange-inbox"><div className="supplier-section-heading"><div><span className="eyebrow">COMPANY TO COMPANY</span><h2>Document inbox</h2><p>Request, review and share with your connected companies.</p></div></div>
    {!supplierId&&<div className="exchange-direction" role="group" aria-label="Request direction"><button aria-pressed={direction==='received'} onClick={()=>{setDirection('received');setPage(0);setActive(null);}}><ArrowDownLeft size={15}/>Received</button><button aria-pressed={direction==='sent'} onClick={()=>{setDirection('sent');setPage(0);setActive(null);}}><ArrowUpRight size={15}/>Sent</button></div>}
    {loading&&<LoadingIndicator compact label="Updating document inbox…"/>}
    {!ready&&!loading&&<div className="exchange-notice"><ShieldCheck size={19}/><div><strong>Direct company requests are being activated.</strong><p>Upload links remain available for collecting documents.</p></div></div>}
    {error&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span><Button variant="ghost" onClick={()=>setRefresh(r=>r+1)}>Retry</Button></div>}
    {ready&&!loading&&!filtered.length&&<div className="exchange-empty"><Files size={24}/><h3>{direction==='received'&&!supplierId?'Your inbox is clear.':'No direct requests yet.'}</h3><p>{direction==='received'&&!supplierId?'Requests from other RELAY companies will arrive here.':'Create a request for a company connected on RELAY.'}</p></div>}
    {ready&&filtered.map(r=><article className="exchange-request" key={r.request_id}><div className="exchange-request-heading"><span className="exchange-company-avatar">{(r.requester_org===organizationId?r.recipient_name:r.requester_name)[0]}</span><div><strong>{r.requester_org===organizationId?r.recipient_name:r.requester_name}</strong><small>{r.requester_org===organizationId?'Requested by your company':'Requested from your company'}</small></div><Badge>{r.submitted_at?'Received':new Date(r.due_at)<new Date()?'Overdue':'Open'}</Badge></div><h3>{r.title}</h3><p className="exchange-due">Due {dateLabel(r.due_at)}</p>
      {r.documents.map(d=><div className="exchange-document" key={d.id}><Files size={16}/><span>{d.name}</span>{d.revoked?<small>Access revoked</small>:<Button variant="ghost" aria-label={`Download ${d.name}`} onClick={()=>void downloadPrivate(d.storage_path,d.name).catch(e=>setError(errorMessage(e)))}><Download size={17}/></Button>}</div>)}
      {!r.submitted_at&&r.recipient_org===organizationId&&(manager?<Button variant="secondary" onClick={()=>setActive(active===r.request_id?null:r.request_id)} aria-expanded={active===r.request_id}>{active===r.request_id?'Close document selection':'Choose documents'}<Files size={16}/></Button>:<p className="quiet-note">An owner or administrator can send company documents.</p>)}
      <div className="exchange-reveal" data-open={active===r.request_id}><div>{active===r.request_id&&<WorkspaceDocumentPicker organizationId={organizationId} busy={working} label={`Send to ${r.requester_name}`} onSent={()=>{setActive(null);setRefresh(v=>v+1);onUpdated?.();}} onSend={async ids=>{if(lock.current)throw new Error('A submission is already in progress.');lock.current=true;setWorking(true);try{await exchangeApi('respond',{organization_id:organizationId,request_id:r.request_id,document_ids:ids});}finally{lock.current=false;setWorking(false);}}}/>}</div></div>
    </article>)}
    {ready&&total>50&&<div className="picker-pagination"><Button variant="ghost" disabled={!page||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {page+1}</span><Button variant="ghost" disabled={(page+1)*50>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></div>}
  </section>;
}
export function IntakeWorkspaceShare({token,onSent}:{token:string;onSent:()=>void}) {
  const [companies,setCompanies]=useState<{id:string;name:string}[]>([]);const [org,setOrg]=useState('');const [signedIn,setSignedIn]=useState(false);const [ready,setReady]=useState(true);
  useEffect(()=>{let active=true;void requireSupabase().auth.getUser().then(async({data})=>{if(!active)return;setSignedIn(!!data.user);if(data.user)try{const rows=await exchangeApi<{id:string;name:string}[]>('organizations');if(active){setCompanies(rows);setOrg(rows[0]?.id||'');}}catch{if(active)setReady(false);}});return()=>{active=false;};},[]);
  function remember(){sessionStorage.setItem('relay-pending-intake',token);}
  return <section className="intake-workspace-share"><h3>Already using RELAY?</h3><p>Send documents from your workspace without uploading them again.</p>{!signedIn?<a className="button button-secondary" href="/login" onClick={remember}>Sign in and choose documents <ArrowUpRight size={16}/></a>:!ready?<p className="quiet-note">Workspace sharing is being activated. You can upload files below.</p>:!companies.length?<p className="quiet-note">An owner or administrator can share documents from your company workspace.</p>:<><label>Sending company<Select value={org} onChange={e=>setOrg(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></label><WorkspaceDocumentPicker key={org} organizationId={org} label="Send selected documents" onSent={onSent} onSend={async ids=>{await exchangeApi('share_link',{organization_id:org,token,document_ids:ids});sessionStorage.removeItem('relay-pending-intake');}}/></>}</section>;
}

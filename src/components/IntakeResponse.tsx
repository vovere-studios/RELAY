import { WorkspaceResponseUpload } from './WorkspaceResponseUpload';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { WorkspaceDocumentPicker, exchangeApi } from './CompanyExchange';
import { OutcomeMark } from './ActionFeedback';
import { LoadingIndicator } from './ui';
import { requireSupabase } from '../lib/supabase';
import { COMPANY_EXCHANGE_ENABLED, COMPANY_DOCUMENT_UPLOAD_ENABLED } from '../lib/feature-activation';
import { dateLabel, errorMessage } from '../lib/cloud-api';

type RequestInfo={company:string;title:string;expires_at:string;remaining:number};
export function IntakeResponse({organizationId,manager}:{organizationId:string;manager:boolean}) {
  const [token]=useState(()=>{try{return sessionStorage.getItem('relay-pending-intake')||'';}catch{return '';}});
  const [info,setInfo]=useState<RequestInfo|null>(null);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const [emailStatus,setEmailStatus]=useState<'idle'|'pending'|'sent'|'failed'>('idle');
  async function sendConfirmation(){
    setEmailStatus('pending');
    try{const {data}=await requireSupabase().auth.getSession();if(!data.session)throw new Error();const response=await fetch('/api/workspace/submission-email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({organization_id:organizationId,token})});const body=await response.json();setEmailStatus(response.ok&&body.emailStatus==='sent'?'sent':'failed');}catch{setEmailStatus('failed');}
  }
  const [upload,setUpload]=useState(false);
  const [revision,setRevision]=useState(0);
  const [saved,setSaved]=useState<{id:string;name:string;kind:string}|undefined>();
  useEffect(()=>{setSaved(undefined);setUpload(false);},[organizationId]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
    if(!token){setError('Open the original upload link to reconnect this request.');clearTimeout(timer);return;}
    void requireSupabase().functions.invoke('relay-intake',{body:{action:'info',token},signal:controller.signal}).then(({data,error})=>{
      if(!active)return;if(error)throw new Error('This link is expired, full or no longer available. Ask for a new link.');setInfo(data);
    }).catch(e=>{if(active)setError(controller.signal.aborted?'The connection took too long. Reload to try again.':errorMessage(e));}).finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[token]);
  return <section className="connected-panel intake-response">
    {sent?<div className="intake-response-delivered" role="status"><OutcomeMark tone="success"/><h2>Documents sent.</h2><p>Your selected documents are now available to {info?.company}.</p><p role="status">{emailStatus==='pending'?'Sending email confirmations…':emailStatus==='sent'?'Confirmation emails have been sent.':'Your documents are delivered. Email confirmation is currently unavailable.'}</p>{emailStatus==='failed'&&<button className="button button-secondary" onClick={()=>void sendConfirmation()}>Retry email confirmation</button>}<Link className="button button-secondary" to={`/cloud?view=documents&org=${organizationId}`}>Back to documents <ArrowUpRight size={16}/></Link></div>:error?<div role="alert" className="form-feedback-error"><OutcomeMark tone="error"/><span>{error}</span></div>:!info?<LoadingIndicator label="Opening your request…"/>:<>
      <div className="intake-response-heading"><span className="eyebrow">REQUESTED BY {info.company}</span><h2>{info.title}</h2><p>Available until {dateLabel(info.expires_at)}. Sending from your selected company workspace.</p></div>
      {COMPANY_EXCHANGE_ENABLED&&manager?<WorkspaceDocumentPicker key={organizationId} organizationId={organizationId} revision={revision} initialSelection={saved} label={`Send to ${info.company}`} maxSelection={Math.min(20,info.remaining)} onSend={async ids=>{await exchangeApi('share_link',{organization_id:organizationId,token,document_ids:ids});}} onSent={()=>{setSent(true);sessionStorage.removeItem('relay-pending-intake');void sendConfirmation();}}/>:<div className="exchange-notice"><ShieldCheck size={20}/><div><strong>{!manager?'Administrator access is needed to share company files.':'Saved-document sharing is awaiting activation.'}</strong><p>You can still send files using the secure upload form below.</p></div></div>}
      {COMPANY_DOCUMENT_UPLOAD_ENABLED&&manager&&<div className="response-new-document"><button className="button button-secondary" aria-expanded={upload} onClick={()=>setUpload(v=>!v)}>{upload?'Close upload':'Add a new company document'} <ArrowUpRight size={16}/></button>{upload&&<WorkspaceResponseUpload key={organizationId} organizationId={organizationId} onSaved={async id=>{const {data}=await requireSupabase().from('documents').select('id,name,kind').eq('id',id).eq('organization_id',organizationId).single();if(data){setSaved(data);setRevision(v=>v+1);setUpload(false);}}}/>}</div>}
      <div className="intake-response-alternatives"><Link className="button button-secondary" to={`/submit?guest=1#token=${encodeURIComponent(token)}`}>Upload files directly <ArrowUpRight size={16}/></Link><p>This sends files to {info.company}. It does not add them to your own workspace.</p></div>
    </>}
  </section>;
}

import { InlineError } from './InlineError';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Dialog, LoadingIndicator, Badge } from './ui';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage, type Row } from '../lib/cloud-api';

/** A targeted lookup keeps search and Inbox links usable beyond the first list page. */
export function RequestDetails({ id, organizationId, onClose }: { id:string|null; organizationId:string; onClose:()=>void }) {
  const [request,setRequest]=useState<Row<'data_requests'>|null>(null);
  const [supplier,setSupplier]=useState<{id:string;legal_name:string}|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!id)return;
    let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    setLoading(true);setError('');setRequest(null);setSupplier(null);
    void (async()=>{
      const client=requireSupabase();
      const result=await client.from('data_requests').select('*').eq('id',id).eq('organization_id',organizationId).abortSignal(controller.signal).maybeSingle();
      if(result.error)throw result.error;if(!result.data)throw new Error('This request is unavailable.');
      const relationship=await client.from('supplier_relationships').select('supplier_id').eq('id',result.data.relationship_id).eq('organization_id',organizationId).abortSignal(controller.signal).maybeSingle();
      if(relationship.error)throw relationship.error;
      let company=null;
      if(relationship.data){const found=await client.from('suppliers').select('id,legal_name').eq('id',relationship.data.supplier_id).eq('organization_id',organizationId).abortSignal(controller.signal).maybeSingle();if(found.error)throw found.error;company=found.data;}
      if(active){setRequest(result.data);setSupplier(company);}
    })().catch(failure=>{if(active)setError(controller.signal.aborted?'The connection took too long. Please try again.':errorMessage(failure));}).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);});
    return()=>{active=false;clearTimeout(timeout);controller.abort();};
  },[id,organizationId,retry]);
  return <Dialog open={!!id} title="Request details." onClose={onClose}>
    {loading&&<LoadingIndicator label="Opening your request…"/>}
    {error&&<InlineError message={error} onRetry={()=>setRetry(value=>value+1)}/>}
    {request&&<div className="request-detail-content"><Badge>{request.status==='received'?'Documents received':'Awaiting response'}</Badge><h3>{request.title}</h3><dl><div><dt>Supplier</dt><dd>{supplier?.legal_name||'Supplier unavailable'}</dd></div><div><dt>Requested</dt><dd>{dateLabel(request.requested_at)}</dd></div><div><dt>Due</dt><dd>{dateLabel(request.due_at)}</dd></div></dl><p>Open the supplier workspace to review documents, requirements and shared information.</p>{supplier&&<Link className="button button-primary" to={`/cloud?view=suppliers&org=${organizationId}&supplier=${supplier.id}&tab=Documents`}>Open supplier workspace<ArrowUpRight size={17}/></Link>}</div>}
  </Dialog>;
}

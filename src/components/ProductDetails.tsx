import { InlineError } from './InlineError';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Input, Button, LoadingIndicator } from './ui';
import { FieldLabel } from './FieldLabel';
import { ActionButton, useActionFeedback } from './ActionFeedback';
import { requireSupabase } from '../lib/supabase';
import { formValidationMessage } from '../lib/form-validation';
import { errorMessage, type Row } from '../lib/cloud-api';
export function ProductDetails({ id, organizationId, manager, onClose, onChanged, onDirtyChange }: {
  id: string | null; organizationId: string; manager: boolean; onClose: () => void; onChanged: () => void; onDirtyChange: (dirty:boolean)=>void;
}) {
  const [record, setRecord] = useState<Row<'products'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const feedback = useActionFeedback(); const lock = useRef(false);
  useEffect(() => {
    if (!id) { setDirty(false); setLeaving(false); return; }
    let active = true; const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),12000);
    setRecord(null); setLoading(true); setError(''); setDirty(false); setLeaving(false); feedback.reset('save');
    void Promise.resolve(requireSupabase().from('products').select('*').eq('id',id).eq('organization_id',organizationId).abortSignal(controller.signal).maybeSingle()).then(result=>{
      if (!active) return; if(result.error) throw result.error; if(!result.data) throw new Error('This product is unavailable.'); setRecord(result.data);
    }).catch(failure=>{if(active)setError(errorMessage(failure));}).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);});
    return()=>{active=false;clearTimeout(timeout);controller.abort();};
  },[id,organizationId,retry]);
  useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
  function close(){if(dirty)setLeaving(true);else onClose();}
  return <Dialog open={!!id} onClose={close} closeDisabled={feedback.phase('save')==='pending'} title="Product information.">
    {loading&&<LoadingIndicator label="Opening product information…"/>}
    {error&&<InlineError message={error} onRetry={!record?()=>setRetry(value=>value+1):undefined}/>}
    {leaving?<div className="workspace-form"><h3>Keep your changes?</h3><p>Your product edits have not been saved.</p><div className="confirmation-actions"><Button variant="secondary" onClick={()=>setLeaving(false)}>Keep editing</Button><Button onClick={()=>{setDirty(false);onClose();}}>Discard and close</Button></div></div>:record&&<form className="workspace-form" onInvalidCapture={event=>{event.preventDefault();setError(formValidationMessage(event.currentTarget));feedback.fail('save');}} onChange={()=>{setDirty(true);setError('');feedback.reset('save');}} onSubmit={async event=>{
      event.preventDefault();if(!manager||lock.current||!feedback.begin('save'))return;lock.current=true;setError('');
      const form=new FormData(event.currentTarget);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
      try{const result=await requireSupabase().from('products').update({name:String(form.get('name')||'').trim(),reference:String(form.get('reference')||'').trim(),material:String(form.get('material')||'').trim()}).eq('id',record.id).eq('organization_id',organizationId).select('*').abortSignal(controller.signal).single();if(result.error)throw result.error;setRecord(result.data);setDirty(false);feedback.succeed('save');onChanged();}catch(failure){setError(errorMessage(failure));feedback.fail('save');}finally{clearTimeout(timeout);lock.current=false;}
    }}>
      <FieldLabel>Product name<Input name="name" required maxLength={160} defaultValue={record.name} disabled={!manager||feedback.phase('save')==='pending'}/></FieldLabel>
      <FieldLabel>Reference<Input name="reference" maxLength={160} defaultValue={record.reference} disabled={!manager||feedback.phase('save')==='pending'}/></FieldLabel>
      <FieldLabel>Material<Input name="material" maxLength={160} defaultValue={record.material} disabled={!manager||feedback.phase('save')==='pending'}/></FieldLabel>
      {manager&&<ActionButton type="submit" label="Save product information" successLabel="Product saved" phase={feedback.phase('save')} outcomeKey={feedback.version('save')} disabled={!dirty}/>}
    </form>}
  </Dialog>;
}

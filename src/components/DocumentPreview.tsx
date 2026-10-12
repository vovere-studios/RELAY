import { InlineError } from './InlineError';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Files, Download, ShieldCheck, ArrowUpRight, Trash2 } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage, type Row } from '../lib/cloud-api';
import { Dialog, Badge, LoadingIndicator, Button, Input } from './ui';
import { ActionButton, useActionFeedback } from './ActionFeedback';
import { resourceLifecycle, documentStatus } from '../lib/resource-lifecycle';
import { FieldLabel } from './FieldLabel';

export function DocumentPreview({ id, organizationId, manager, lifecycleEnabled, onClose, onChanged }: {
  id: string | null; organizationId: string; manager: boolean; lifecycleEnabled: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [document, setDocument] = useState<Row<'documents'> | null>(null);
  const [sharedReview, setSharedReview] = useState<{status:string;note:string}|null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const feedback = useActionFeedback();
  const [intent, setIntent] = useState<'reject'|'trash'|null>(null);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);
  const [lastAction, setLastAction] = useState<'review'|'reject'|'trash'>('review');
  const lock = useRef(false);
  useEffect(() => {
    if (!id) return;
    let active = true; let objectUrl = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setDocument(null); setSharedReview(null); setUrl(''); setIntent(null); setNote(''); setLastAction('review'); setError(''); setLoading(true); feedback.reset('review');
    void (async () => {
      try {
        const client = requireSupabase();
        const result = await client.from('documents').select('*').eq('id', id).abortSignal(controller.signal).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) throw new Error('This document is unavailable or its access was revoked.');
        const doc = result.data;
        if (doc.organization_id !== organizationId) {
          const share = await client.from('document_shares').select('id').eq('document_id', doc.id).eq('recipient_organization_id', organizationId).is('revoked_at', null).abortSignal(controller.signal).maybeSingle();
          if (share.error || !share.data) throw new Error('This document is not shared with your current company.');
          if (lifecycleEnabled) {
            const status = await resourceLifecycle<{status:string;note:string}>('status', organizationId, 'shared_document', {id:doc.id}, controller.signal);
            if (active) setSharedReview(status);
          }
        }
        if (!active) return;
        setDocument(doc);
        const file = await client.storage.from('relay-documents').download(doc.storage_path, { cacheNonce: crypto.randomUUID() }, { cache: 'no-store', signal: controller.signal });
        if (file.error) throw file.error;
        if (!active) return;
        objectUrl = URL.createObjectURL(file.data); setUrl(objectUrl);
      } catch (failure) { if (active) setError(controller.signal.aborted ? 'The file took too long to open. Try again.' : errorMessage(failure)); }
      finally { clearTimeout(timeout); if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); clearTimeout(timeout); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, organizationId, retry, lifecycleEnabled]);
  async function review(action: 'review'|'reject'|'trash' = 'review') {
    if (!document || (document.organization_id !== organizationId && !lifecycleEnabled) || !manager || lock.current || !feedback.begin('review')) return;
    lock.current = true; setWorking(true); setLastAction(action); setError('');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      if (lifecycleEnabled) await resourceLifecycle(action, organizationId, document.organization_id===organizationId?'document':'shared_document', { id: document.id, note }, controller.signal);
      else {
        if (action !== 'review') throw new Error('Document management is not available yet.');
        const result = await requireSupabase().from('documents').update({ verification_status: 'verified' }).eq('id', document.id).eq('organization_id', organizationId).select('id').abortSignal(controller.signal);
        if (result.error) throw result.error;
        if (!result.data?.length) throw new Error('This document is unavailable.');
      }
      if (action === 'trash') { feedback.succeed('review', () => { onChanged(); onClose(); }); }
      else { if (document.organization_id===organizationId) setDocument(previous => previous && { ...previous, verification_status: action === 'reject' ? 'rejected' : 'verified', review_note: action === 'reject' ? note : '' }); else setSharedReview({status:action==='reject'?'rejected':'verified',note:action==='reject'?note:''}); setIntent(null); feedback.succeed('review'); onChanged(); }
    } catch (failure) { setError(errorMessage(failure)); feedback.fail('review'); }
    finally { clearTimeout(timeout); lock.current = false; setWorking(false); }
  }
  const foreign = !!document && document.organization_id!==organizationId;
  const status = foreign && lifecycleEnabled ? sharedReview?.status || 'unverified' : document?.verification_status || 'unverified';
  return <Dialog open={!!id} onClose={onClose} closeDisabled={working || feedback.phase('review')==='success'} title={document?.name || 'Your document.'} className="document-preview-dialog">
    {loading && <LoadingIndicator label="Opening your document…"/>}
    {error && <InlineError message={error} onRetry={()=>setRetry(value=>value+1)}/>}
    {document && <>
      <div className="document-preview-meta"><span><Files size={15}/>{document.kind==='company'?'Company information':document.kind==='certificate'?'Certificate':document.kind==='declaration'?'Declaration':document.kind}</span><span>Uploaded {dateLabel(document.uploaded_at)}</span><Badge><span data-document-status={status}>{documentStatus(status)}</span></Badge></div>
      {status==='rejected' && <div className="document-rejection-note"><strong>Review declined</strong><p>{(foreign?sharedReview?.note:document.review_note) || 'This file needs replacement or a new review.'}</p></div>}
      {url && <div className="document-preview-content">{document.mime_type.startsWith('image/') ? <img src={url} alt={document.name}/> : <object data={url} type="application/pdf" aria-label={`Preview ${document.name}`}><div className="document-preview-fallback"><Files size={30}/><p>Your browser cannot display this PDF inline.</p><a href={url} download={document.name}>Download PDF<Download size={16}/></a></div></object>}</div>}
      <div className="document-preview-actions">
        {url && <a className="button button-secondary" href={url} download={document.name}><Download size={16}/>Download</a>}
        {manager && (!foreign || lifecycleEnabled) && !intent && <ActionButton label={status==='rejected'?'Accept after review':'Mark as reviewed'} pendingLabel="Saving review…" successLabel={lastAction==='reject'?'Document rejected':'Review saved'} phase={feedback.phase('review')} outcomeKey={feedback.version('review')} disabled={status==='verified' || loading || !url} onClick={()=>void review()}/>}
        {manager && lifecycleEnabled && !intent && <><Button variant="secondary" disabled={working || feedback.phase('review')==='success' || status==='rejected'} onClick={()=>{feedback.reset('review');setError('');setIntent('reject');}}>Reject document</Button><Button variant="ghost" disabled={working || feedback.phase('review')==='success'} onClick={()=>{feedback.reset('review');setError('');setIntent('trash');}}><Trash2 size={16}/>Remove</Button></>}
      </div>
      {intent && <form className="document-review-intent" onSubmit={event=>{event.preventDefault();void review(intent);}}>
        <h3>{intent==='reject'?'Decline this document?':'Move this document to Trash?'}</h3>
        <p>{foreign?(intent==='reject'?'Decline this file for your company and record what needs correction. The sending company keeps its original document.':'Remove this shared file from your workspace. You can restore it while the sending company continues to share it.') : intent==='reject'?'Linked requirements become missing and existing shares are revoked. The file stays available for review.':'The file is kept in Trash for recovery. Linked requirements become missing and sharing stops. Restoring does not restore previous shares.'}</p>
        {intent==='reject' && <FieldLabel>Reason for rejection<Input required minLength={3} maxLength={500} value={note} onChange={event=>{setNote(event.target.value);feedback.reset('review');}} placeholder="What needs to be corrected?"/></FieldLabel>}
        <div className="confirmation-actions"><Button type="button" variant="secondary" disabled={working} onClick={()=>{setIntent(null);feedback.reset('review');setError('');}}>Keep document</Button><ActionButton type="submit" label={intent==='reject'?'Reject document':'Move to Trash'} pendingLabel="Updating…" successLabel={intent==='reject'?'Document rejected':'Moved to Trash'} phase={feedback.phase('review')} outcomeKey={feedback.version('review')} disabled={working}/></div>
      </form>}
      <p className="document-preview-note"><ShieldCheck size={15}/>{foreign && <span>Your company’s review. </span>}Access follows your company’s document permissions. Reviewing does not verify the document’s legal validity.</p>
      {document.organization_id===organizationId && document.supplier_id && <Link className="text-link" to={`/cloud?org=${organizationId}&view=suppliers&supplier=${document.supplier_id}&tab=Documents`}>Open supplier workspace<ArrowUpRight size={15}/></Link>}
    </>}
  </Dialog>;
}

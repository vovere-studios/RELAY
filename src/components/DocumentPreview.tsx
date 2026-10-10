import { InlineError } from './InlineError';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Files, Download, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage, type Row } from '../lib/cloud-api';
import { Dialog, Badge, LoadingIndicator } from './ui';
import { ActionButton, useActionFeedback } from './ActionFeedback';

export function DocumentPreview({ id, organizationId, manager, onClose, onChanged }: {
  id: string | null; organizationId: string; manager: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [document, setDocument] = useState<Row<'documents'> | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const feedback = useActionFeedback();
  const lock = useRef(false);
  useEffect(() => {
    if (!id) return;
    let active = true; let objectUrl = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setDocument(null); setUrl(''); setError(''); setLoading(true); feedback.reset('review');
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
  }, [id, organizationId, retry]);
  async function review() {
    if (!document || document.organization_id !== organizationId || !manager || lock.current || !feedback.begin('review')) return;
    lock.current = true; setError('');
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const result = await requireSupabase().from('documents').update({ verification_status: 'verified' }).eq('id', document.id).eq('organization_id', organizationId).select('id').abortSignal(controller.signal).single();
      if (result.error) throw result.error;
      setDocument(previous => previous && { ...previous, verification_status: 'verified' });
      feedback.succeed('review'); onChanged();
    } catch (failure) { setError(errorMessage(failure)); feedback.fail('review'); }
    finally { clearTimeout(timeout); lock.current = false; }
  }
  return <Dialog open={!!id} onClose={onClose} closeDisabled={feedback.phase('review')==='pending'} title={document?.name || 'Your document.'} className="document-preview-dialog">
    {loading && <LoadingIndicator label="Opening your document…"/>}
    {error && <InlineError message={error} onRetry={()=>setRetry(value=>value+1)}/>}
    {document && <>
      <div className="document-preview-meta"><span><Files size={15}/>{document.kind}</span><span>Uploaded {dateLabel(document.uploaded_at)}</span><Badge>{document.verification_status==='verified'?'Reviewed':'Awaiting review'}</Badge></div>
      {url && <div className="document-preview-content">{document.mime_type.startsWith('image/') ? <img src={url} alt={document.name}/> : <object data={url} type="application/pdf" aria-label={`Preview ${document.name}`}><div className="document-preview-fallback"><Files size={30}/><p>Your browser cannot display this PDF inline.</p><a href={url} download={document.name}>Download PDF<Download size={16}/></a></div></object>}</div>}
      <div className="document-preview-actions">
        {url && <a className="button button-secondary" href={url} download={document.name}><Download size={16}/>Download</a>}
        {manager && document.organization_id===organizationId && <ActionButton label="Mark as reviewed" pendingLabel="Saving review…" successLabel="Review saved" phase={feedback.phase('review')} outcomeKey={feedback.version('review')} disabled={document.verification_status==='verified' || loading || !url} onClick={()=>void review()}/>}
      </div>
      <p className="document-preview-note"><ShieldCheck size={15}/>Access follows your company’s document permissions. Reviewing does not verify the document’s legal validity.</p>
      {document.organization_id===organizationId && <Link className="text-link" to={`/cloud?org=${organizationId}&view=suppliers&supplier=${document.supplier_id}&tab=Documents`}>Open supplier workspace<ArrowUpRight size={15}/></Link>}
    </>}
  </Dialog>;
}

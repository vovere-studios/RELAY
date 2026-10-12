import { useEffect, useRef, useState } from 'react';
import { ArchiveRestore } from 'lucide-react';
import { resourceLifecycle, type ResourceKind } from '../lib/resource-lifecycle';
import { dateLabel, errorMessage } from '../lib/cloud-api';
import { ActionButton, useActionFeedback } from './ActionFeedback';
import { Dialog, Button, LoadingIndicator } from './ui';
import { InlineError } from './InlineError';
type TrashList = { total: number; items: { id: string; name: string; deleted_at: string }[] };
export function ResourceTrash({ open, organizationId, resource, supplierId, onClose, onChanged }: { open: boolean; organizationId: string; resource: ResourceKind; supplierId?: string; onClose: () => void; onChanged: () => void }) {
  const [list, setList] = useState<TrashList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const feedback = useActionFeedback();
  useEffect(() => { setPage(0); setList(null); }, [open, organizationId, resource, supplierId]);
  useEffect(() => {
    if (!open) return;
    let active = true; const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError('');
    void resourceLifecycle<TrashList>('list', organizationId, resource, { supplier_id: supplierId, page }, controller.signal)
      .then(value => { if (active) setList(value); })
      .catch(failure => { if (active) setError(errorMessage(failure)); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [open, organizationId, resource, supplierId, page, revision]);
  async function restore(id: string) {
    if (lock.current || !feedback.begin(id)) return;
    lock.current = true; setWorking(true); setError('');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
    try { await resourceLifecycle('restore', organizationId, resource, { id }, controller.signal); feedback.succeed(id, () => { if (list?.items.length === 1 && page > 0) setPage(value => value - 1); else setRevision(value => value + 1); onChanged(); }); }
    catch (failure) { setError(errorMessage(failure)); feedback.fail(id); }
    finally { clearTimeout(timeout); lock.current = false; setWorking(false); }
  }
  return <Dialog open={open} title={resource === 'document' ? 'Document trash' : resource==='shared_document'?'Shared document trash':'Requirement trash'} onClose={onClose} closeDisabled={working}>
    <p className="quiet-note">{resource === 'document' ? 'Restore a removed document. Previous shares stay revoked, and requirements need a new review. Files in Trash still use storage.' : resource==='shared_document'?'Restore a file shared by this supplier. It remains available only while the sending company grants access.':'Restore a removed requirement to this supplier’s review checklist.'}</p>
    {error && <InlineError message={error} onRetry={() => setRevision(value => value + 1)} />}
    {loading ? <LoadingIndicator label="Opening Trash…" /> : list && <div className="trash-list">
      {!list.items.length && <div className="trash-empty"><ArchiveRestore size={28} /><h3>Nothing in Trash.</h3><p>Removed {resource === 'requirement' ? 'requirements' : 'documents'} will appear here.</p></div>}
      {list.items.map(item => <div className="trash-row" key={item.id}><div><strong>{item.name}</strong><small>Removed {dateLabel(item.deleted_at)}</small></div><ActionButton variant="secondary" label="Restore" pendingLabel="Restoring…" successLabel="Restored" phase={feedback.phase(item.id)} outcomeKey={feedback.version(item.id)} disabled={working} onClick={() => void restore(item.id)} /></div>)}
      {list.total > 25 && <div className="confirmation-actions"><Button variant="secondary" disabled={!page || working} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page + 1}</span><Button variant="secondary" disabled={(page + 1) * 25 >= list.total || working} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
    </div>}
  </Dialog>;
}

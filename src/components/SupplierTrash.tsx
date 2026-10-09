import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react';
import { Dialog, Button, LoadingIndicator } from './ui';
import { ActionButton, OutcomeMark, useActionFeedback } from './ActionFeedback';
import { requireSupabase } from '../lib/supabase';
import { errorMessage, dateLabel } from '../lib/cloud-api';

type Supplier = { id: string; legal_name: string };
type Impact = { name: string; documents: number; products: number; links: number; shares: number };
type TrashList = { total: number; items: (Supplier & { country: string; deleted_at: string })[] };
async function lifecycle<T>(action: string, organization_id: string, supplier_id?: string, page = 0) {
  const { data, error } = await requireSupabase().rpc('relay_supplier_lifecycle', { action, payload: { organization_id, supplier_id, page } });
  if (error) throw error;
  return data as T;
}

/** Destructive intent is explicit. Removal is recoverable; public access is not restored. */
export function SupplierTrash({ open, organizationId, supplier, onClose, onChanged }: {
  open: boolean; organizationId: string; supplier?: Supplier; onClose: () => void; onChanged: (removed: boolean) => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [list, setList] = useState<TrashList | null>(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const feedback = useActionFeedback();
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  const supplierId = supplier?.id;
  useEffect(() => { if(open) { setPage(0); setReceipt(null); setError(''); } }, [open, supplierId]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setLoading(true); setError(''); setImpact(null);
    const request = supplierId ? lifecycle<Impact>('preview', organizationId, supplierId) : lifecycle<TrashList>('list', organizationId, undefined, page);
    void request.then(value => { if(current) { if(supplierId) setImpact(value as Impact); else setList(value as TrashList); } })
      .catch(reason => { if(current) setError(errorMessage(reason)); })
      .finally(() => { if(current) setLoading(false); });
    return () => { current = false; };
  }, [open, organizationId, supplierId, page, revision]);
  async function run(action: 'trash' | 'restore', target: Supplier) {
    if(lock.current || !feedback.begin(target.id)) return;
    lock.current = true; setWorking(true); setError('');
    try {
      await lifecycle(action, organizationId, target.id);
      feedback.succeed(target.id);
      if(action === 'trash') setReceipt(target.legal_name);
      else { setRevision(value => value + 1); onChanged(false); }
    } catch(reason) { setError(errorMessage(reason)); feedback.fail(target.id); }
    finally { lock.current = false; setWorking(false); }
  }
  const close = () => { if(!lock.current) { if(receipt) onChanged(true); onClose(); } };
  return <Dialog open={open} onClose={close} closeDisabled={working} title={receipt ? 'Moved to Trash.' : supplier ? 'Remove this supplier?' : 'Supplier trash'} className="supplier-trash-dialog">
    {receipt ? <div className="action-receipt" role="status"><OutcomeMark tone="success"/><h3>{receipt}</h3><p>Removed from your workspace. The supplier and its documents can be restored from Trash.</p><Button onClick={close}>Back to suppliers <ArrowLeft size={16}/></Button></div> : <>
      {error && <div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}
      {loading ? <LoadingIndicator label="Checking supplier information…"/> : supplier && impact ? <div className="removal-review">
        <div className="removal-company"><span><Trash2 size={22}/></span><div><strong>{impact.name}</strong><small>Only removed from this workspace</small></div></div>
        <p>The supplier and its records move to Trash. You can restore them later.</p>
        <div className="removal-counts"><span><b>{impact.documents}</b> Documents kept</span><span><b>{impact.products}</b> Products kept</span></div>
        <div className="removal-access"><strong>Sharing stops immediately.</strong><p>{impact.links} upload links and {impact.shares} document shares will be revoked. Restoring this supplier will not reactivate them.</p></div>
        <div className="confirmation-actions"><Button variant="secondary" onClick={close} disabled={working}>Keep supplier</Button><ActionButton label="Move to Trash" pendingLabel="Removing…" successLabel="Removed" phase={feedback.phase(supplier.id)} onClick={()=>void run('trash',supplier)}/></div>
      </div> : !supplier && list ? <div className="trash-list">
        <p className="quiet-note">Restore a supplier and its records. Previously shared links stay revoked.</p>
        {!list.items.length && <div className="trash-empty"><ArchiveRestore size={28}/><h3>Nothing in Trash.</h3><p>Removed suppliers will appear here.</p></div>}
        {list.items.map(item=><div className="trash-row" key={item.id}><div><strong>{item.legal_name}</strong><small>Removed {dateLabel(item.deleted_at)}</small></div><ActionButton variant="secondary" label="Restore" pendingLabel="Restoring…" successLabel="Restored" disabled={working} phase={feedback.phase(item.id)} onClick={()=>void run('restore',item)}/></div>)}
        {list.total>50 && <div className="confirmation-actions"><Button variant="secondary" disabled={!page||working} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {page+1}</span><Button variant="secondary" disabled={(page+1)*50>=list.total||working} onClick={()=>setPage(p=>p+1)}>Next</Button></div>}
      </div> : null}
      {error && !loading && !impact && <Button variant="secondary" onClick={()=>setRevision(v=>v+1)}>Try again</Button>}
    </>}
  </Dialog>;
}

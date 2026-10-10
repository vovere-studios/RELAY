import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { dateLabel, errorMessage, type Row } from '../lib/cloud-api';
import { InlineError } from './InlineError';
import { LoadingIndicator, Badge, Button } from './ui';

/** Supplier-scoped lookup: independent of the paginated workspace snapshot. */
export function SupplierRequests({ organizationId, supplierId, revision, onOpen }: {
  organizationId: string; supplierId: string; revision: unknown; onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<Row<'data_requests'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => { setPage(0); }, [organizationId, supplierId]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError(''); setRows([]);
    void (async () => {
      const client = requireSupabase();
      const relationships = await client.from('supplier_relationships').select('id')
        .eq('organization_id', organizationId).eq('supplier_id', supplierId).abortSignal(controller.signal);
      if (relationships.error) throw relationships.error;
      const ids = (relationships.data || []).map(row => row.id);
      if (!ids.length) { if (active) setTotal(0); return; }
      const result = await client.from('data_requests').select('*', { count: 'exact' })
        .eq('organization_id', organizationId).in('relationship_id', ids).neq('status', 'received')
        .order('due_at', { ascending: true }).order('id').range(page * 10, page * 10 + 9).abortSignal(controller.signal);
      if (result.error) throw result.error;
      if (active) { setRows(result.data || []); setTotal(result.count || 0); }
    })().catch(failure => { if (active) setError(controller.signal.aborted ? 'Requests took too long to load. Please try again.' : errorMessage(failure)); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [organizationId, supplierId, revision, retry, page]);
  return <section className="supplier-open-requests" aria-label="Open document requests">
    <div className="supplier-section-heading"><div><h2>Open requests{!loading && !error && total > 0 ? ` · ${total}` : ''}</h2><p>Information you’re waiting for from this supplier.</p></div></div>
    {loading ? <LoadingIndicator compact label="Loading requests…" /> : error ? <InlineError message={error} onRetry={() => setRetry(value => value + 1)} /> : <>
      {rows.map(request => <button type="button" className="supplier-request-card" key={request.id} onClick={() => onOpen(request.id)}>
        <span className="supplier-request-copy"><strong>{request.title}</strong><small>Requested {dateLabel(request.requested_at)} · Due {dateLabel(request.due_at)}</small></span>
        <Badge>{new Date(request.due_at).getTime() < Date.now() ? 'Overdue' : 'Awaiting response'}</Badge><ArrowUpRight size={18} aria-hidden="true" />
      </button>)}
      {!total && <p className="quiet-note">No open requests. New document requests will appear here.</p>}
      {total > 10 && <div className="supplier-request-pagination"><Button variant="ghost" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button><span>{page + 1} / {Math.ceil(total / 10)}</span><Button variant="ghost" disabled={(page + 1) * 10 >= total} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
    </>}
  </section>;
}

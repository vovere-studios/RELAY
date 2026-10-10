import { InlineError } from './InlineError';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, Building2, Files, Package, ArrowDownLeft } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { errorMessage } from '../lib/cloud-api';
import { Dialog, LoadingIndicator } from './ui';

type Hit = { id: string; title: string; detail: string; kind: 'supplier' | 'document' | 'product' | 'request'; url: string };
const icons = { supplier: Building2, document: Files, product: Package, request: ArrowDownLeft };
export function ConnectedSearch({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const navigate = useNavigate();
  const [shortcutLabel,setShortcutLabel]=useState("Ctrl K");
  useEffect(()=>{setShortcutLabel(/Mac|iPhone|iPad/.test(navigator.platform)?"⌘ K":"Ctrl K");},[]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!open && document.querySelector('dialog[open]')) return;
        event.preventDefault(); setOpen(value => !value);
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [open]);
  useEffect(() => { setOpen(false); setQuery(''); setHits([]); }, [organizationId]);
  useEffect(() => {
    if (!open) return;
    setActive(0); setHits([]); setError('');
    const term = query.trim().slice(0, 100).replace(/[\\%_]/g, '\\$&');
    if (!term) { setBusy(false); return; }
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let current = true;
    const timer = setTimeout(async () => {
      const client = requireSupabase();
      try {
        const rows = await Promise.all([
          client.from('suppliers').select('id,legal_name,country').eq('organization_id', organizationId).ilike('legal_name', `%${term}%`).order('legal_name').limit(6).abortSignal(controller.signal),
          client.from('documents').select('id,name,kind').eq('organization_id', organizationId).ilike('name', `%${term}%`).order('uploaded_at', { ascending: false }).limit(6).abortSignal(controller.signal),
          client.from('products').select('id,name,supplier_id').eq('organization_id', organizationId).ilike('name', `%${term}%`).order('name').limit(6).abortSignal(controller.signal),
          client.from('data_requests').select('id,title,status').eq('organization_id', organizationId).ilike('title', `%${term}%`).order('requested_at', { ascending: false }).limit(6).abortSignal(controller.signal),
        ]);
        if (!current) return;
        const failure = rows.find(row => row.error)?.error;
        if (failure) throw failure;
        const base = `/cloud?org=${organizationId}`;
        setHits([
          ...(rows[0].data || []).map(row => ({ id: row.id, title: row.legal_name, detail: row.country, kind: 'supplier' as const, url: `${base}&view=suppliers&supplier=${row.id}` })),
          ...(rows[1].data || []).map(row => ({ id: row.id, title: row.name, detail: row.kind, kind: 'document' as const, url: `${base}&view=documents&document=${row.id}` })),
          ...(rows[2].data || []).map(row => ({ id: row.id, title: row.name, detail: 'Product information', kind: 'product' as const, url: `${base}&view=products&product=${row.id}` })),
          ...(rows[3].data || []).map(row => ({ id: row.id, title: row.title, detail: row.status === 'open' ? 'Awaiting response' : 'Documents received', kind: 'request' as const, url: `${base}&view=requests&focus=${row.id}` })),
        ]);
      } catch (failure) { if (current) setError(controller.signal.aborted ? 'Search took too long. Change your search to retry.' : errorMessage(failure)); }
      finally { clearTimeout(timeout); if (current) setBusy(false); }
    }, 180);
    return () => { current = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [open, organizationId, query]);
  const selected = Math.min(active, Math.max(0, hits.length - 1));
  useEffect(()=>{if(open)document.getElementById(`${resultsId}-${selected}`)?.scrollIntoView({block:"nearest"});},[selected,open]);
  function visit(hit: Hit) { setOpen(false); navigate(hit.url); }
  return <>
    <button className="connected-global-search" aria-label="Search workspace" aria-keyshortcuts="Meta+K Control+K" aria-haspopup="dialog" onClick={() => { setQuery(''); setOpen(true); }}><Search size={17}/><span>Search workspace</span><kbd>{shortcutLabel}</kbd></button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Find what you need." className="connected-search-dialog">
      <div className="command-input"><Search size={19}/><input ref={input} type="search" maxLength={100} placeholder="Suppliers, documents, products, requests…" aria-label="Search your company workspace" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={resultsId} aria-activedescendant={hits[selected] ? `${resultsId}-${selected}` : undefined} value={query}
        onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive((selected + (event.key === 'ArrowDown' ? 1 : -1) + hits.length) % Math.max(1, hits.length)); }
          if (event.key === 'Enter' && hits[selected]) { event.preventDefault(); visit(hits[selected]); }
        }}/></div>
      {busy && <LoadingIndicator compact label="Searching your workspace…"/>}
      {error && <InlineError message={error}/>}
      <div id={resultsId} role="listbox" aria-label="Workspace search results" className="connected-command-results">
        {hits.map((hit, index) => { const Icon = icons[hit.kind]; return <button key={`${hit.kind}-${hit.id}`} id={`${resultsId}-${index}`} role="option" aria-selected={selected === index} tabIndex={-1} onPointerMove={() => setActive(index)} onClick={() => visit(hit)}><Icon size={18} strokeWidth={1.6}/><span><strong>{hit.title}</strong><small>{hit.kind} · {hit.detail}</small></span><ArrowUpRight size={15}/></button>; })}
      </div>
      {!query.trim() && <div className="search-start"><p>One search for your company workspace.</p><div>{[['suppliers', 'Suppliers'], ['documents', 'Documents'], ['requests', 'Requests']].map(([view, label]) => <button key={view} onClick={() => { setOpen(false); navigate(`/cloud?view=${view}&org=${organizationId}`); }}>{label}<ArrowUpRight size={14}/></button>)}</div></div>}
      {!busy && query.trim() && !hits.length && !error && <div className="command-empty"><strong>No matches yet.</strong><p>Try a shorter name or another keyword.</p></div>}
      <div className="command-footer"><span>↑ ↓ Navigate</span><span>↵ Open</span><span>esc Close</span></div>
    </Dialog>
  </>;
}

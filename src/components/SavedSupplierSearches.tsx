import { useEffect, useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { Button } from './ui';
export function SavedSupplierSearches({ userId, organizationId, query, onSelect }: {userId:string;organizationId:string;query:string;onSelect:(query:string)=>void}) {
  const key=`relay-supplier-searches-${userId}-${organizationId}`;
  const [saved,setSaved]=useState<string[]>([]);const [error,setError]=useState('');
  useEffect(()=>{setError('');try{const values=JSON.parse(localStorage.getItem(key)||'[]');setSaved(Array.isArray(values)?values.filter(value=>typeof value==='string'&&value.length<=100).slice(0,8):[]);}catch{setSaved([]);}},[key]);
  function update(values:string[]){setSaved(values);try{localStorage.setItem(key,JSON.stringify(values));setError('');}catch{setError('Saved on this page only. Browser storage is unavailable.');}}
  const term=query.trim().slice(0,100);
  return <div className="saved-supplier-searches">{saved.map(value=><span className="saved-search-pill" key={value}><button type="button" aria-pressed={term===value} onClick={()=>onSelect(value)}>{value}</button><button type="button" aria-label={`Remove saved search ${value}`} onClick={()=>update(saved.filter(item=>item!==value))}><X size={12}/></button></span>)}{term&&!saved.includes(term)&&saved.length<8&&<Button variant="ghost" onClick={()=>update([...saved,term])}><Bookmark size={14}/>Save this search</Button>}{saved.length>0&&<small>Saved on this device</small>}{error&&<small role="status">{error}</small>}</div>;
}

create or replace function relay_private.supplier_lifecycle(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' set lock_timeout='3s' as $$
declare org uuid:=(payload->>'organization_id')::uuid; sid uuid:=(payload->>'supplier_id')::uuid;
 supplier_row public.suppliers; result jsonb; pg integer:=greatest(0,least(coalesce((payload->>'page')::int,0),100000));
begin
 if auth.uid() is null or not relay_private.can_access_org(org,true) then raise exception 'Only company owners and admins can manage supplier removal.' using errcode='42501'; end if;
 if action='list' then
  select jsonb_build_object('total',(select count(*) from relay_private.supplier_trash where organization_id=org),'items',coalesce(jsonb_agg(to_jsonb(t)),'[]')) into result
  from (select c.id,c.legal_name,c.country,t.deleted_at from relay_private.supplier_trash t join public.suppliers c on c.id=t.supplier_id and c.organization_id=t.organization_id where t.organization_id=org order by t.deleted_at desc,c.id limit 50 offset pg*50) t;
  return result;
 end if;
 if action not in ('preview','trash','restore') then raise exception 'Unknown supplier action'; end if;
 select * into supplier_row from public.suppliers where id=sid and organization_id=org for update;
 if not found then raise exception 'Supplier not found in this company.' using errcode='42501'; end if;
 if action='preview' then
  return jsonb_build_object('name',supplier_row.legal_name,'documents',(select count(*) from public.documents where organization_id=org and supplier_id=sid),'products',(select count(*) from public.products where organization_id=org and supplier_id=sid),'links',(select count(*) from public.upload_links where organization_id=org and supplier_id=sid and revoked_at is null),'shares',(select count(*) from public.document_shares ds join public.documents d on d.id=ds.document_id where ds.sender_organization_id=org and d.supplier_id=sid and ds.revoked_at is null));
 elsif action='trash' then
  insert into relay_private.supplier_trash(supplier_id,organization_id,deleted_by) values(sid,org,auth.uid()) on conflict(supplier_id) do nothing;
  if found then
   update public.upload_links set revoked_at=now() where organization_id=org and supplier_id=sid and revoked_at is null;
   update public.document_shares set revoked_at=now() where sender_organization_id=org and document_id in (select id from public.documents where organization_id=org and supplier_id=sid) and revoked_at is null;
   insert into public.workspace_events(organization_id,actor_id,title,detail) values(org,auth.uid(),'Supplier moved to Trash',supplier_row.legal_name);
  end if;
 else
  delete from relay_private.supplier_trash where supplier_id=sid and organization_id=org;
  if found then insert into public.workspace_events(organization_id,actor_id,title,detail) values(org,auth.uid(),'Supplier restored',supplier_row.legal_name); end if;
 end if;
 return jsonb_build_object('id',sid,'name',supplier_row.legal_name);
end $$;

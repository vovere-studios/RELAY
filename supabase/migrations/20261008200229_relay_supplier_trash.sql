-- Recoverable removal. Original records/files remain private; links stay revoked on restore.
create table relay_private.supplier_trash (
 supplier_id uuid primary key, organization_id uuid not null,
 deleted_at timestamptz not null default now(), deleted_by uuid not null,
 foreign key (organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade
);
alter table relay_private.supplier_trash enable row level security;
revoke all on relay_private.supplier_trash from public,anon,authenticated;
create index supplier_trash_org_date on relay_private.supplier_trash(organization_id,deleted_at desc,supplier_id);
create function relay_private.supplier_active(org uuid, supplier uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from relay_private.supplier_trash where organization_id=org and supplier_id=supplier)
$$;
revoke all on function relay_private.supplier_active(uuid,uuid) from public,anon;
grant execute on function relay_private.supplier_active(uuid,uuid) to authenticated;
create function relay_private.relationship_active(org uuid, relationship uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.supplier_relationships r where r.organization_id=org and r.id=relationship and relay_private.supplier_active(org,r.supplier_id))
$$;
revoke all on function relay_private.relationship_active(uuid,uuid) from public,anon;
grant execute on function relay_private.relationship_active(uuid,uuid) to authenticated;
create view relay_private.active_suppliers with (security_invoker=true) as select * from public.suppliers where relay_private.supplier_active(organization_id,id);
revoke all on relay_private.active_suppliers from public,anon,authenticated;
create policy active_supplier_only on public.suppliers as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,id)) with check (relay_private.supplier_active(organization_id,id));
create view relay_private.active_supplier_relationships with (security_invoker=true) as select * from public.supplier_relationships where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_supplier_relationships from public,anon,authenticated;
create policy active_supplier_only on public.supplier_relationships as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,supplier_id)) with check (relay_private.supplier_active(organization_id,supplier_id));
create view relay_private.active_documents with (security_invoker=true) as select * from public.documents where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_documents from public,anon,authenticated;
create policy active_supplier_only on public.documents as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,supplier_id)) with check (relay_private.supplier_active(organization_id,supplier_id));
create view relay_private.active_products with (security_invoker=true) as select * from public.products where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_products from public,anon,authenticated;
create policy active_supplier_only on public.products as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,supplier_id)) with check (relay_private.supplier_active(organization_id,supplier_id));
create view relay_private.active_certificates with (security_invoker=true) as select * from public.certificates where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_certificates from public,anon,authenticated;
create policy active_supplier_only on public.certificates as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,supplier_id)) with check (relay_private.supplier_active(organization_id,supplier_id));
create view relay_private.active_upload_links with (security_invoker=true) as select * from public.upload_links where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_upload_links from public,anon,authenticated;
create policy active_supplier_only on public.upload_links as restrictive for all to authenticated using (relay_private.supplier_active(organization_id,supplier_id)) with check (relay_private.supplier_active(organization_id,supplier_id));
create view relay_private.active_relationship_health with (security_invoker=true) as select * from public.relationship_health where relay_private.supplier_active(organization_id,supplier_id);
revoke all on relay_private.active_relationship_health from public,anon,authenticated;
create view relay_private.active_requirements with (security_invoker=true) as select * from public.requirements where relay_private.relationship_active(organization_id,relationship_id);
revoke all on relay_private.active_requirements from public,anon,authenticated;
create policy active_relationship_only on public.requirements as restrictive for all to authenticated using (relay_private.relationship_active(organization_id,relationship_id)) with check (relay_private.relationship_active(organization_id,relationship_id));
create view relay_private.active_data_requests with (security_invoker=true) as select * from public.data_requests where relay_private.relationship_active(organization_id,relationship_id);
revoke all on relay_private.active_data_requests from public,anon,authenticated;
create policy active_relationship_only on public.data_requests as restrictive for all to authenticated using (relay_private.relationship_active(organization_id,relationship_id)) with check (relay_private.relationship_active(organization_id,relationship_id));
create view relay_private.active_request_requirements with (security_invoker=true) as select * from public.request_requirements where relay_private.relationship_active(organization_id,relationship_id);
revoke all on relay_private.active_request_requirements from public,anon,authenticated;
create policy active_relationship_only on public.request_requirements as restrictive for all to authenticated using (relay_private.relationship_active(organization_id,relationship_id)) with check (relay_private.relationship_active(organization_id,relationship_id));
-- Preserve the live snapshot's authorization and pagination; filter BEFORE counts/limits.
do $migration$
declare body text; t text;
begin
 body:=pg_get_functiondef('relay_private.relay_workspace_snapshot(jsonb)'::regprocedure);
 foreach t in array array['suppliers','supplier_relationships','documents','products','certificates','upload_links','relationship_health','requirements','data_requests','request_requirements'] loop
  body:=replace(body,'public.'||t,'relay_private.active_'||t);
 end loop;
 execute body;
end $migration$;

-- Definer RPCs bypass RLS, so also guard writes from stale clients and guest intake.
create function relay_private.guard_active_supplier() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=to_jsonb(new); sid uuid; org uuid;
begin
 org:=(row_data->>'organization_id')::uuid;
 if tg_table_name='suppliers' then sid:=(row_data->>'id')::uuid;
 elsif row_data ? 'supplier_id' then sid:=(row_data->>'supplier_id')::uuid;
 elsif row_data ? 'relationship_id' then
  select supplier_id into sid from public.supplier_relationships where organization_id=org and id=(row_data->>'relationship_id')::uuid;
 elsif tg_table_name='document_shares' then
  if new.revoked_at is not null then return new; end if;
  org:=(row_data->>'sender_organization_id')::uuid;
  select supplier_id into sid from public.documents where organization_id=org and id=(row_data->>'document_id')::uuid;
 end if;
 if tg_table_name='upload_links' and row_data->>'revoked_at' is not null then return new; end if;
 if sid is not null then
  -- Serialize archive against document/product/requirement writes.
  perform 1 from public.suppliers where id=sid and organization_id=org for key share;
  if not relay_private.supplier_active(org,sid) then raise exception 'This supplier is in Trash. Restore it before making changes.' using errcode='55000'; end if;
 end if;
 return new;
end $$;
revoke all on function relay_private.guard_active_supplier() from public,anon,authenticated;
do $migration$
declare t text;
begin
 foreach t in array array['suppliers','supplier_relationships','documents','products','certificates','requirements','data_requests','request_requirements','upload_links','document_shares'] loop
  execute format('create trigger guard_active_supplier before insert or update on public.%I for each row execute function relay_private.guard_active_supplier()',t);
 end loop;
end $migration$;

create function relay_private.supplier_lifecycle(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' set lock_timeout='3s' as $$
declare org uuid:=(payload->>'organization_id')::uuid; sid uuid:=(payload->>'supplier_id')::uuid;
 s public.suppliers; result jsonb; pg integer:=greatest(0,least(coalesce((payload->>'page')::int,0),100000));
begin
 if auth.uid() is null or not relay_private.can_access_org(org,true) then raise exception 'Only company owners and admins can manage supplier removal.' using errcode='42501'; end if;
 if action='list' then
  select jsonb_build_object('total',(select count(*) from relay_private.supplier_trash where organization_id=org),'items',coalesce(jsonb_agg(to_jsonb(t)),'[]')) into result
  from (select s.id,s.legal_name,s.country,t.deleted_at from relay_private.supplier_trash t join public.suppliers s on s.id=t.supplier_id and s.organization_id=t.organization_id where t.organization_id=org order by t.deleted_at desc,s.id limit 50 offset pg*50) t;
  return result;
 end if;
 if action not in ('preview','trash','restore') then raise exception 'Unknown supplier action'; end if;
 select * into s from public.suppliers where id=sid and organization_id=org for update;
 if not found then raise exception 'Supplier not found in this company.' using errcode='42501'; end if;
 if action='preview' then
  return jsonb_build_object('name',s.legal_name,'documents',(select count(*) from public.documents where organization_id=org and supplier_id=sid),'products',(select count(*) from public.products where organization_id=org and supplier_id=sid),'links',(select count(*) from public.upload_links where organization_id=org and supplier_id=sid and revoked_at is null),'shares',(select count(*) from public.document_shares ds join public.documents d on d.id=ds.document_id where ds.sender_organization_id=org and d.supplier_id=sid and ds.revoked_at is null));
 elsif action='trash' then
  insert into relay_private.supplier_trash(supplier_id,organization_id,deleted_by) values(sid,org,auth.uid()) on conflict(supplier_id) do nothing;
  if found then
   update public.upload_links set revoked_at=now() where organization_id=org and supplier_id=sid and revoked_at is null;
   update public.document_shares set revoked_at=now() where sender_organization_id=org and document_id in (select id from public.documents where organization_id=org and supplier_id=sid) and revoked_at is null;
   insert into public.workspace_events(organization_id,actor_id,title,detail) values(org,auth.uid(),'Supplier moved to Trash',s.legal_name);
  end if;
 else
  delete from relay_private.supplier_trash where supplier_id=sid and organization_id=org;
  if found then insert into public.workspace_events(organization_id,actor_id,title,detail) values(org,auth.uid(),'Supplier restored',s.legal_name); end if;
 end if;
 return jsonb_build_object('id',sid,'name',s.legal_name);
end $$;
revoke all on function relay_private.supplier_lifecycle(text,jsonb) from public,anon;
grant execute on function relay_private.supplier_lifecycle(text,jsonb) to authenticated;
create function public.relay_supplier_lifecycle(action text,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select relay_private.supplier_lifecycle(action,payload) $$;
revoke all on function public.relay_supplier_lifecycle(text,jsonb) from public,anon;
grant execute on function public.relay_supplier_lifecycle(text,jsonb) to authenticated;

-- Bounded, tenant-authorized dashboard reads. No tokens or auth secrets are returned.
create index if not exists suppliers_org_name_page_idx on public.suppliers(organization_id,legal_name,id);
create index if not exists documents_org_uploaded_page_idx on public.documents(organization_id,uploaded_at desc,id);
create index if not exists requests_org_requested_page_idx on public.data_requests(organization_id,requested_at desc,id);
create index if not exists products_org_name_page_idx on public.products(organization_id,name,id);
create index if not exists invitations_org_created_page_idx on public.team_invitations(organization_id,created_at desc,id);
create index if not exists links_org_created_page_idx on public.upload_links(organization_id,created_at desc,id);
create or replace function public.relay_workspace_snapshot(payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' set statement_timeout = '8s' as $$
declare
 uid uuid := auth.uid(); org uuid; company public.organizations; member_role text;
 section text := coalesce(payload->>'view','overview');
 pg integer := greatest(0,least(coalesce((payload->>'page')::integer,0),100000));
 skip integer; detail_skip integer := greatest(0,least(coalesce((payload->>'detail_page')::integer,0),100000))*50;
 selected uuid := nullif(payload->>'selected','')::uuid;
 term text := left(coalesce(payload->>'query',''),100);
 lookup_term text := left(coalesce(payload->>'lookup',''),100);
 detail_tab text := coalesce(payload->>'detail_tab','Company');
 organizations jsonb; supplier_rows jsonb := '[]'; supplier_ids uuid[] := '{}'; list_ids uuid[] := '{}';
 doc_rows jsonb := '[]'; req_rows jsonb := '[]'; product_rows jsonb := '[]'; health_rows jsonb := '[]';
 certificate_rows jsonb := '[]'; requirement_rows jsonb := '[]'; events jsonb := '[]';
 members jsonb := '[]'; invites jsonb := '[]'; links jsonb := '[]'; received jsonb := '[]'; sent jsonb := '[]';
 total bigint := 0; detail_total bigint := 0; metrics jsonb := '{}';
begin
 if uid is null then raise exception 'Sign in to open your workspace' using errcode='42501'; end if;
 if section not in ('overview','suppliers','documents','requests','products','directory','activity','team','settings') then raise exception 'Unknown workspace section'; end if;
 select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at,o.id),'[]') into organizations
 from public.organizations o where o.owner_id=uid or exists(select 1 from public.organization_members m where m.organization_id=o.id and m.user_id=uid);
 org := coalesce(nullif(payload->>'organization_id','')::uuid,(organizations->0->>'id')::uuid);
 if org is null then return jsonb_build_object('needs_workspace',true); end if;
 if not relay_private.can_access_org(org) then raise exception 'Company access denied' using errcode='42501'; end if;
 select * into strict company from public.organizations where id=org;
 select case when company.owner_id=uid then 'owner' else (select role from public.organization_members where organization_id=org and user_id=uid) end into member_role;
 if selected is not null and not exists(select 1 from public.suppliers where id=selected and organization_id=org) then raise exception 'Supplier access denied' using errcode='42501'; end if;
 skip := pg*50;
 if section='overview' then
  metrics := jsonb_build_object('suppliers',(select count(*) from public.suppliers where organization_id=org),
   'documents',(select count(*) from public.documents where organization_id=org),
   'complete',(select count(*) from public.relationship_health where organization_id=org and status='complete'),
   'requests',(select count(*) from public.data_requests where organization_id=org and status='open'));
  select coalesce(jsonb_agg(to_jsonb(h)),'[]'),coalesce(array_agg(h.supplier_id),'{}') into health_rows,supplier_ids
  from (select * from public.relationship_health where organization_id=org and status<>'complete' order by completeness,id limit 5) h;
 elsif section='suppliers' then
  select count(*) into total from public.suppliers where organization_id=org and (legal_name ilike '%'||term||'%' or country ilike '%'||term||'%' or category ilike '%'||term||'%');
  select coalesce(array_agg(s.id),'{}') into list_ids from (select id from public.suppliers where organization_id=org and (legal_name ilike '%'||term||'%' or country ilike '%'||term||'%' or category ilike '%'||term||'%') order by legal_name,id limit 50 offset skip) s;
  supplier_ids := list_ids;
 elsif section='documents' then
  select greatest((select count(*) from public.documents where organization_id=org),(select count(*) from public.document_shares where recipient_organization_id=org and revoked_at is null),(select count(*) from public.document_shares where sender_organization_id=org)) into total;
 elsif section='requests' then
  select greatest((select count(*) from public.data_requests where organization_id=org),(select count(*) from public.upload_links where organization_id=org and member_role<>'member')) into total;
 elsif section='products' then
  select count(*) into total from public.products where organization_id=org;
 elsif section='team' then
  select greatest(1+(select count(*) from public.organization_members where organization_id=org and user_id<>company.owner_id),(select count(*) from public.team_invitations where organization_id=org and member_role<>'member')) into total;
 elsif section='activity' then
  select count(*) into total from (select title,created_at from public.workspace_events where organization_id=org union select title,occurred_at from public.activities where organization_id=org) a;
 end if;
 -- Fetch only the active list or the active supplier tab; every list is capped at 50.
 if section='documents' or selected is not null or payload->>'dialog'='share' then
  select coalesce(jsonb_agg(to_jsonb(d)),'[]') into doc_rows from (select * from public.documents where organization_id=org and (selected is null or supplier_id=selected) order by uploaded_at desc,id limit 50 offset case when selected is not null then case when detail_tab='Documents' then detail_skip else 0 end when section='documents' then skip else 0 end) d;
 end if;
 if section='requests' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into req_rows from (select * from public.data_requests where organization_id=org order by requested_at desc,id limit 50 offset skip) r;
 end if;
 if section='products' then
  select coalesce(jsonb_agg(to_jsonb(p)),'[]') into product_rows from (select * from public.products where organization_id=org order by name,id limit 50 offset skip) p;
 end if;
 -- A searchable supplier picker supplies at most 50 options, independent of list pagination.
 if payload->>'dialog' in ('document','product','request') then
  supplier_ids := supplier_ids || coalesce((select array_agg(s.id) from (select id from public.suppliers where organization_id=org and legal_name ilike '%'||lookup_term||'%' order by legal_name,id limit 50) s),'{}');
 end if;
 supplier_ids := supplier_ids || coalesce((select array_agg((d->>'supplier_id')::uuid) from jsonb_array_elements(doc_rows) d),'{}')
  || coalesce((select array_agg((p->>'supplier_id')::uuid) from jsonb_array_elements(product_rows) p),'{}')
  || coalesce((select array_agg(supplier_id) from public.supplier_relationships where organization_id=org and id in(select (r->>'relationship_id')::uuid from jsonb_array_elements(req_rows) r)),'{}');
 if selected is not null then supplier_ids := array_append(supplier_ids,selected); end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.legal_name,s.id),'[]') into supplier_rows from public.suppliers s where s.organization_id=org and s.id=any(supplier_ids);
 if section<>'overview' or selected is not null or payload->>'dialog'='request' then
  select coalesce(jsonb_agg(to_jsonb(h)),'[]') into health_rows from public.relationship_health h where organization_id=org and supplier_id=any(supplier_ids);
 end if;
 if selected is not null then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into requirement_rows from (select r.* from public.requirements r join public.supplier_relationships s on s.id=r.relationship_id and s.organization_id=r.organization_id where r.organization_id=org and s.supplier_id=selected order by r.id limit 50 offset case when detail_tab='Requirements' then detail_skip else 0 end) r;
  select coalesce(jsonb_agg(to_jsonb(c)),'[]') into certificate_rows from (select * from public.certificates where organization_id=org and supplier_id=selected order by valid_until nulls last,id limit 50 offset case when detail_tab='Certificates' then detail_skip else 0 end) c;
  select case detail_tab when 'Documents' then (select count(*) from public.documents where organization_id=org and supplier_id=selected) when 'Certificates' then (select count(*) from public.certificates where organization_id=org and supplier_id=selected) when 'Requirements' then (select count(*) from public.requirements r join public.supplier_relationships s on s.id=r.relationship_id and s.organization_id=r.organization_id where r.organization_id=org and s.supplier_id=selected) else 0 end into detail_total;
 end if;
 select coalesce(jsonb_agg(to_jsonb(e)),'[]') into events from (select * from (select id,organization_id,actor_id,title,detail,created_at from public.workspace_events where organization_id=org union select id,organization_id,actor_id,title,description,occurred_at from public.activities where organization_id=org) e order by created_at desc,id limit case when section='activity' then 50 else 12 end offset case when section='activity' then skip else 0 end) e;
 if section='team' then
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into members from (select * from (select u.id,u.email,coalesce(p.full_name,'') full_name,'owner'::text role from auth.users u left join public.profiles p on p.id=u.id where u.id=company.owner_id union all select u.id,u.email,coalesce(p.full_name,''),m.role from public.organization_members m join auth.users u on u.id=m.user_id left join public.profiles p on p.id=u.id where m.organization_id=org and m.user_id<>company.owner_id) t order by (role='owner') desc,email,id limit 50 offset skip) t;
  if member_role<>'member' then
   select coalesce(jsonb_agg(to_jsonb(i)-'token_hash'),'[]') into invites from (select * from public.team_invitations where organization_id=org order by created_at desc,id limit 50 offset skip) i;
  end if;
 end if;
 if section='requests' and member_role<>'member' then
  select coalesce(jsonb_agg(to_jsonb(l)-'token_hash'),'[]') into links from (select * from public.upload_links where organization_id=org order by created_at desc,id limit 50 offset skip) l;
 end if;
 if section='documents' then
  select coalesce(jsonb_agg(to_jsonb(s)),'[]') into received from (select s.id,s.document_id,s.shared_at,d.name,d.kind,d.mime_type,d.storage_path,o.legal_name sender_name from public.document_shares s join public.documents d on d.id=s.document_id join public.organizations o on o.id=s.sender_organization_id where s.recipient_organization_id=org and s.revoked_at is null order by s.shared_at desc,s.id limit 50 offset skip) s;
  select coalesce(jsonb_agg(to_jsonb(s)),'[]') into sent from (select * from public.document_shares where sender_organization_id=org order by shared_at desc,id limit 50 offset skip) s;
 end if;
 return jsonb_build_object('org',to_jsonb(company),'organizations',organizations,'role',member_role,'suppliers',supplier_rows,'listSupplierIds',to_jsonb(list_ids),'health',health_rows,'documents',doc_rows,'requests',req_rows,'requirements',requirement_rows,'certificates',certificate_rows,'products',product_rows,'events',events,'members',members,'invitations',invites,'links',links,'shares',received,'sentShares',sent,'directory',(select to_jsonb(d) from public.company_directory d where organization_id=org),'settings',(select to_jsonb(s) from public.workspace_settings s where organization_id=org),'metrics',metrics,'total',total,'detailTotal',detail_total,'page',pg);
end $$;
revoke all on function public.relay_workspace_snapshot(jsonb) from public,anon;
grant execute on function public.relay_workspace_snapshot(jsonb) to authenticated;

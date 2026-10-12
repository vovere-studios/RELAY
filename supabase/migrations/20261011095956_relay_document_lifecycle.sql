-- Recoverable document/requirement removal; no customer files are physically deleted.
alter table public.documents drop constraint documents_verification_status_check;
alter table public.documents add constraint documents_verification_status_check check(verification_status in ('unverified','verified','rejected'));
alter table public.documents add column review_note text not null default '' check(length(review_note)<=500);
alter table public.documents add column reviewed_at timestamptz;
alter table public.documents add column reviewed_by uuid references auth.users(id) on delete set null;
create table relay_private.document_trash (
 document_id uuid primary key, organization_id uuid not null, deleted_by uuid not null, deleted_at timestamptz not null default now(),
 foreign key(organization_id,document_id) references public.documents(organization_id,id) on delete cascade
);
create table relay_private.requirement_trash (
 requirement_id uuid primary key, organization_id uuid not null, deleted_by uuid not null, deleted_at timestamptz not null default now(),
 foreign key(organization_id,requirement_id) references public.requirements(organization_id,id) on delete cascade
);
alter table relay_private.document_trash enable row level security;
alter table relay_private.requirement_trash enable row level security;
revoke all on relay_private.document_trash,relay_private.requirement_trash from public,anon,authenticated;
create index document_trash_org_date on relay_private.document_trash(organization_id,deleted_at desc,document_id);
create index requirement_trash_org_date on relay_private.requirement_trash(organization_id,deleted_at desc,requirement_id);
create function relay_private.document_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from relay_private.document_trash where document_id=target)
$$;
create function relay_private.requirement_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from relay_private.requirement_trash where requirement_id=target)
$$;
revoke all on function relay_private.document_active(uuid),relay_private.requirement_active(uuid) from public,anon;
grant execute on function relay_private.document_active(uuid),relay_private.requirement_active(uuid) to authenticated;
create or replace view relay_private.active_documents with(security_invoker=true) as select * from public.documents where relay_private.supplier_active(organization_id,supplier_id) and relay_private.document_active(id);
create or replace view relay_private.active_requirements with(security_invoker=true) as select * from public.requirements where relay_private.relationship_active(organization_id,relationship_id) and relay_private.requirement_active(id);
create policy visible_document_only on public.documents as restrictive for all to authenticated using(relay_private.document_active(id)) with check(relay_private.document_active(id));
create policy visible_requirement_only on public.requirements as restrictive for all to authenticated using(relay_private.requirement_active(id)) with check(relay_private.requirement_active(id));
-- Stored objects remain recoverable, but cannot be read through previously issued paths.
create function relay_private.file_not_trashed(path text) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from relay_private.document_trash t join public.documents d on d.id=t.document_id where d.storage_path=path)
$$;
revoke all on function relay_private.file_not_trashed(text) from public,anon;
grant execute on function relay_private.file_not_trashed(text) to authenticated;
create policy visible_relay_file_only on storage.objects as restrictive for select to authenticated using(bucket_id<>'relay-documents' or relay_private.file_not_trashed(name));
-- Qualify the outer storage path explicitly, so real company files cannot be treated as orphans.
drop policy relay_company_orphan_files_delete on storage.objects;
create policy relay_company_orphan_files_delete on storage.objects for delete to authenticated using(
 bucket_id='relay-documents' and split_part(name,'/',2)='company' and exists(select 1 from public.organizations o where o.id::text=split_part(objects.name,'/',1) and relay_private.can_access_org(o.id,true))
 and not exists(select 1 from public.documents d where d.storage_path=objects.name)
);

-- Future updates can name their destination without guessing from display text.
alter table public.workspace_events add column target_type text check(target_type in ('document','requirement','supplier','request','team'));
alter table public.workspace_events add column target_id uuid;
alter table public.workspace_events add column supplier_id uuid;

-- Recipient reviews never change the sending company's original file.
create table relay_private.shared_document_reviews (
 share_id uuid primary key references public.document_shares(id) on delete cascade,
 organization_id uuid not null references public.organizations(id),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','verified','rejected')),
 review_note text not null default '' check(length(review_note)<=500),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, removed_at timestamptz
);
alter table relay_private.shared_document_reviews enable row level security;
revoke all on relay_private.shared_document_reviews from public,anon,authenticated;
create index shared_document_reviews_trash_idx on relay_private.shared_document_reviews(organization_id,removed_at desc,share_id) where removed_at is not null;
create index shared_document_reviews_actor_idx on relay_private.shared_document_reviews(reviewed_by) where reviewed_by is not null;
create function relay_private.share_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from relay_private.shared_document_reviews where share_id=target and removed_at is not null)
$$;
revoke all on function relay_private.share_active(uuid) from public,anon;
grant execute on function relay_private.share_active(uuid) to authenticated;
create policy visible_shared_document_only on public.documents as restrictive for select to authenticated using(
 relay_private.can_access_org(organization_id) or exists(select 1 from public.document_shares ds where ds.document_id=documents.id and ds.revoked_at is null and relay_private.share_active(ds.id) and relay_private.can_access_org(ds.recipient_organization_id))
);
create function relay_private.file_visible_to_company(path text) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.documents where storage_path=path) or exists(
  select 1 from public.documents d where d.storage_path=path and (relay_private.can_access_org(d.organization_id) or exists(select 1 from public.document_shares ds where ds.document_id=d.id and ds.revoked_at is null and relay_private.share_active(ds.id) and relay_private.can_access_org(ds.recipient_organization_id)))
 )
$$;
revoke all on function relay_private.file_visible_to_company(text) from public,anon;
grant execute on function relay_private.file_visible_to_company(text) to authenticated;
create policy visible_shared_relay_file_only on storage.objects as restrictive for select to authenticated using(bucket_id<>'relay-documents' or relay_private.file_visible_to_company(name));

create function relay_private.resource_lifecycle(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' set lock_timeout='3s' as $$
declare org uuid:=(payload->>'organization_id')::uuid; target uuid:=nullif(payload->>'id','')::uuid;
 kind text:=payload->>'resource'; sid uuid:=nullif(payload->>'supplier_id','')::uuid;
 pg integer:=greatest(0,least(coalesce((payload->>'page')::integer,0),100000));
 doc public.documents; req public.requirements; shared public.document_shares; result jsonb; note text:=trim(coalesce(payload->>'note','')); affected integer;
begin
 if auth.uid() is null or not relay_private.can_access_org(org,not(kind='shared_document' and action='status')) then raise exception 'Only owners and administrators can manage documents and requirements.' using errcode='42501'; end if;
 if kind not in ('document','requirement','shared_document') or kind is null then raise exception 'Unknown resource'; end if;
 if action='list' then
  if kind='shared_document' then
   select jsonb_build_object('total',(select count(*) from relay_private.shared_document_reviews v join public.document_shares ds on ds.id=v.share_id join relay_private.active_documents d on d.id=ds.document_id where v.organization_id=org and v.removed_at is not null and ds.revoked_at is null and ds.sender_organization_id=(select source_organization_id from relay_private.active_suppliers where organization_id=org and id=sid)),
    'items',coalesce(jsonb_agg(to_jsonb(item)),'[]')) into result from (
    select d.id,d.name,v.removed_at deleted_at from relay_private.shared_document_reviews v join public.document_shares ds on ds.id=v.share_id join relay_private.active_documents d on d.id=ds.document_id where v.organization_id=org and v.removed_at is not null and ds.revoked_at is null and ds.sender_organization_id=(select source_organization_id from relay_private.active_suppliers where organization_id=org and id=sid) order by v.removed_at desc,d.id limit 25 offset pg*25
   ) item;
  elsif kind='document' then
   select jsonb_build_object('total',(select count(*) from relay_private.document_trash t join public.documents d on d.id=t.document_id where t.organization_id=org and relay_private.supplier_active(org,d.supplier_id) and (case when sid is null then d.supplier_id is null else d.supplier_id=sid end)),
    'items',coalesce(jsonb_agg(to_jsonb(item)),'[]')) into result from (
    select d.id,d.name,t.deleted_at from relay_private.document_trash t join public.documents d on d.id=t.document_id where t.organization_id=org and relay_private.supplier_active(org,d.supplier_id) and (case when sid is null then d.supplier_id is null else d.supplier_id=sid end) order by t.deleted_at desc,d.id limit 25 offset pg*25
   ) item;
  else
   select jsonb_build_object('total',(select count(*) from relay_private.requirement_trash t join public.requirements q on q.id=t.requirement_id join public.supplier_relationships r on r.id=q.relationship_id where t.organization_id=org and r.supplier_id=sid and relay_private.supplier_active(org,sid)),
    'items',coalesce(jsonb_agg(to_jsonb(item)),'[]')) into result from (
    select q.id,q.name,t.deleted_at from relay_private.requirement_trash t join public.requirements q on q.id=t.requirement_id join public.supplier_relationships r on r.id=q.relationship_id where t.organization_id=org and r.supplier_id=sid and relay_private.supplier_active(org,sid) order by t.deleted_at desc,q.id limit 25 offset pg*25
   ) item;
  end if;
  return result;
 end if;
 if kind='shared_document' then
  select ds.* into shared from public.document_shares ds join relay_private.active_documents d on d.id=ds.document_id where ds.document_id=target and ds.recipient_organization_id=org and ds.revoked_at is null for update of ds;
  if not found then raise exception 'This shared document is unavailable.' using errcode='42501';end if;
  select id into sid from relay_private.active_suppliers where organization_id=org and source_organization_id=shared.sender_organization_id order by id limit 1;
  if action='status' then
   return coalesce((select jsonb_build_object('status',verification_status,'note',review_note) from relay_private.shared_document_reviews where share_id=shared.id and removed_at is null),jsonb_build_object('status','unverified','note',''));
  end if;
  if action in ('review','reject') then
   if not relay_private.share_active(shared.id) then raise exception 'Restore this shared document first.';end if;
   if action='reject' and length(note) not between 3 and 500 then raise exception 'Enter a reason between 3 and 500 characters.';end if;
   insert into relay_private.shared_document_reviews(share_id,organization_id,verification_status,review_note,reviewed_by,reviewed_at)
    values(shared.id,org,case when action='reject' then 'rejected' else 'verified' end,case when action='reject' then note else '' end,auth.uid(),now())
    on conflict(share_id) do update set verification_status=excluded.verification_status,review_note=excluded.review_note,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at
    where shared_document_reviews.verification_status is distinct from excluded.verification_status or shared_document_reviews.review_note is distinct from excluded.review_note;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  elsif action='trash' then
   insert into relay_private.shared_document_reviews(share_id,organization_id,removed_at) values(shared.id,org,now()) on conflict(share_id) do update set removed_at=excluded.removed_at where shared_document_reviews.removed_at is null;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  elsif action='restore' then
   update relay_private.shared_document_reviews set removed_at=null where share_id=shared.id and organization_id=org and removed_at is not null;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  else raise exception 'Unknown shared document action';end if;
  insert into public.workspace_events(organization_id,actor_id,title,detail,target_type,target_id,supplier_id)
   values(org,auth.uid(),case action when 'review' then 'Shared document reviewed' when 'reject' then 'Shared document rejected' when 'trash' then 'Shared document moved to Trash' else 'Shared document restored' end,(select name from public.documents where id=target),'document',target,sid);
  if action='reject' then
   insert into public.workspace_events(organization_id,actor_id,title,detail,target_type,target_id)
    values(shared.sender_organization_id,auth.uid(),'Shared document declined by '||(select legal_name from public.organizations where id=org),(select name from public.documents where id=target)||': '||note,'document',target);
  end if;
 elsif kind='document' then
  select * into doc from public.documents where id=target and organization_id=org for update;
  if not found or not relay_private.supplier_active(org,doc.supplier_id) then raise exception 'Document unavailable in this company.' using errcode='42501'; end if;
  sid:=doc.supplier_id;
  if action in ('review','reject') then
   if not relay_private.document_active(target) then raise exception 'Restore this document before reviewing it.';end if;
   if action='reject' and length(note) not between 3 and 500 then raise exception 'Enter a reason between 3 and 500 characters.';end if;
   if doc.verification_status=(case when action='reject' then 'rejected' else 'verified' end) and doc.review_note=(case when action='reject' then note else '' end) then return jsonb_build_object('saved',true);end if;
   update public.documents set verification_status=case when action='reject' then 'rejected' else 'verified' end,review_note=case when action='reject' then note else '' end,reviewed_at=now(),reviewed_by=auth.uid() where id=target;
  elsif action='trash' then
   -- Clear links to evidence before hiding the document. Restoring never marks evidence complete automatically.
   update public.requirements set document_id=null,status='missing' where organization_id=org and document_id=target and relay_private.requirement_active(id);
   update public.document_shares set revoked_at=now() where document_id=target and sender_organization_id=org and revoked_at is null;
   insert into relay_private.document_trash(document_id,organization_id,deleted_by) values(target,org,auth.uid()) on conflict(document_id) do nothing;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  elsif action='restore' then
   delete from relay_private.document_trash where document_id=target and organization_id=org;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  else raise exception 'Unknown document action';end if;
  insert into public.workspace_events(organization_id,actor_id,title,detail,target_type,target_id,supplier_id)
   values(org,auth.uid(),case action when 'review' then 'Document reviewed' when 'reject' then 'Document rejected' when 'trash' then 'Document moved to Trash' else 'Document restored' end,doc.name,'document',target,sid);
 else
  select * into req from public.requirements where id=target and organization_id=org for update;
  if not found then raise exception 'Requirement unavailable in this company.' using errcode='42501';end if;
  select supplier_id into sid from public.supplier_relationships where id=req.relationship_id and organization_id=org;
  if not relay_private.supplier_active(org,sid) then raise exception 'Restore this supplier first.';end if;
  if action='trash' then
   insert into relay_private.requirement_trash(requirement_id,organization_id,deleted_by) values(target,org,auth.uid()) on conflict(requirement_id) do nothing;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
  elsif action='restore' then
   delete from relay_private.requirement_trash where requirement_id=target and organization_id=org;
   get diagnostics affected=row_count;
   if affected=0 then return jsonb_build_object('saved',true);end if;
   if req.document_id is not null and not exists(select 1 from relay_private.active_documents where id=req.document_id and verification_status<>'rejected') then update public.requirements set document_id=null,status='missing' where id=target;end if;
  else raise exception 'Unknown requirement action';end if;
  insert into public.workspace_events(organization_id,actor_id,title,detail,target_type,target_id,supplier_id)
   values(org,auth.uid(),case when action='trash' then 'Requirement moved to Trash' else 'Requirement restored' end,req.name,'requirement',target,sid);
 end if;
 return jsonb_build_object('saved',true);
end $$;
revoke all on function relay_private.resource_lifecycle(text,jsonb) from public,anon;
grant execute on function relay_private.resource_lifecycle(text,jsonb) to authenticated;
create function public.relay_resource_lifecycle(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select relay_private.resource_lifecycle(action,payload)$$;
revoke all on function public.relay_resource_lifecycle(text,jsonb) from public,anon;
grant execute on function public.relay_resource_lifecycle(text,jsonb) to authenticated;

-- Review rejection invalidates linked evidence and existing recipient access atomically.
create function relay_private.guard_document_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not relay_private.document_active(new.id) then raise exception 'Restore this document before making changes.';end if;
 if new.verification_status='rejected' and old.verification_status is distinct from new.verification_status then
  update public.requirements set status='missing',document_id=null where organization_id=new.organization_id and document_id=new.id and relay_private.requirement_active(id);
  update public.document_shares set revoked_at=now() where sender_organization_id=new.organization_id and document_id=new.id and revoked_at is null;
 end if;
 return new;
end $$;
revoke all on function relay_private.guard_document_review() from public,anon,authenticated;
create trigger guard_document_review before update on public.documents for each row execute function relay_private.guard_document_review();
create function relay_private.guard_evidence() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; org uuid;
begin
 if tg_table_name='requirements' then
  if not relay_private.requirement_active(new.id) then raise exception 'Restore this requirement first.';end if;
  target:=new.document_id;org:=new.organization_id;
 elsif tg_table_name='document_shares' then
  if new.revoked_at is not null then return new;end if;
  target:=new.document_id;org:=new.sender_organization_id;
 else target:=new.document_id;org:=new.organization_id;
 end if;
 if target is not null then perform 1 from public.documents where id=target and organization_id=org for share;end if;
 if target is not null and not exists(select 1 from public.documents d where d.id=target and d.organization_id=org and relay_private.document_active(d.id) and d.verification_status<>'rejected') then raise exception 'Rejected or removed documents cannot be used as evidence or shared.';end if;
 return new;
end $$;
revoke all on function relay_private.guard_evidence() from public,anon,authenticated;
create trigger guard_evidence before insert or update on public.requirements for each row execute function relay_private.guard_evidence();
create trigger guard_evidence before insert or update on public.document_shares for each row execute function relay_private.guard_evidence();
create trigger guard_evidence before insert or update on public.certificates for each row execute function relay_private.guard_evidence();

-- Certificate records for removed/rejected files no longer count as valid evidence.
create or replace view relay_private.active_certificates with(security_invoker=true) as select * from public.certificates where relay_private.supplier_active(organization_id,supplier_id) and exists(select 1 from relay_private.active_documents d where d.id=document_id and d.verification_status<>'rejected');
create policy usable_certificate_only on public.certificates as restrictive for select to authenticated using(exists(select 1 from public.documents d where d.id=document_id and d.verification_status<>'rejected'));

create index documents_company_library_idx on public.documents(organization_id,uploaded_at desc,id) where supplier_id is null;
-- Preserve public invoker permissions while filtering archived requirements explicitly.
create or replace view public.relationship_health with(security_invoker=true) as
select r.id,r.organization_id,r.supplier_id,r.created_at,
 case when count(q.id)=0 then 0 else round(100.0*count(q.id) filter(where q.status='satisfied')/count(q.id))::integer end as completeness,
 count(q.id) filter(where q.status='missing')::integer as missing_requirements,
 case when exists(select 1 from public.certificates c join public.documents d on d.id=c.document_id where c.organization_id=r.organization_id and c.supplier_id=r.supplier_id and c.valid_until<=current_date+30 and relay_private.document_active(d.id) and d.verification_status<>'rejected') then 'attention'
 when count(q.id)=0 or count(q.id) filter(where q.status='missing')>0 then 'missing' else 'complete' end as status
from public.supplier_relationships r left join public.requirements q on q.organization_id=r.organization_id and q.relationship_id=r.id and relay_private.requirement_active(q.id) group by r.id;

do $migration$
declare body text; old_fragment text;
begin
 body:=pg_get_functiondef('relay_private.relay_workspace_snapshot(jsonb)'::regprocedure);
 old_fragment:='select greatest((select count(*) from relay_private.active_documents where organization_id=org),(select count(*) from public.document_shares where recipient_organization_id=org and revoked_at is null),(select count(*) from public.document_shares where sender_organization_id=org)) into total;';
 if position(old_fragment in body)=0 then raise exception 'Unexpected snapshot document count; review migration.';end if;
 body:=replace(body,old_fragment,'select count(*) into total from relay_private.active_documents where organization_id=org and supplier_id is null and name ilike ''%''||term||''%'';');
 old_fragment:='(selected is null or supplier_id=selected)';
 if position(old_fragment in body)=0 then raise exception 'Unexpected snapshot document query.';end if;
 body:=replace(body,old_fragment,'(case when selected is not null then supplier_id=selected else supplier_id is null end) and (section<>''documents'' or payload->>''dialog''=''share'' or name ilike ''%''||term||''%'')');
 body:=replace(body,'if section=''documents'' then'||chr(10)||'  select coalesce(jsonb_agg(to_jsonb(s)),''[]'') into received', 'if selected is not null then'||chr(10)||'  select coalesce(jsonb_agg(to_jsonb(s)),''[]'') into received');
 body:=replace(body,'where s.recipient_organization_id=org and s.revoked_at is null order by','where s.recipient_organization_id=org and s.revoked_at is null and relay_private.share_active(s.id) and s.sender_organization_id=(select source_organization_id from public.suppliers where id=selected and organization_id=org) order by');
 body:=replace(body,'where sender_organization_id=org order by shared_at', 'where sender_organization_id=org and document_id in (select id from relay_private.active_documents where organization_id=org and supplier_id is null) order by shared_at');
 body:=replace(body,'return jsonb_build_object(''org''', 'if section=''documents'' then select coalesce(jsonb_agg(to_jsonb(s)),''[]'') into sent from (select ds.*,d.name document_name,o.legal_name recipient_name,coalesce((select verification_status from relay_private.shared_document_reviews where share_id=ds.id),''unverified'') recipient_review from public.document_shares ds join relay_private.active_documents d on d.id=ds.document_id join public.organizations o on o.id=ds.recipient_organization_id where ds.sender_organization_id=org and d.supplier_id is null and ds.revoked_at is null order by ds.shared_at desc,ds.id limit 50 offset greatest(0,least(coalesce((payload->>''share_page'')::integer,0),100000))*50) s;end if; return jsonb_build_object(''org''');
 body:=replace(body,'''metrics'',metrics', '''documentLifecycle'',true,''sentSharesTotal'',(select count(*) from public.document_shares ds join relay_private.active_documents d on d.id=ds.document_id where ds.sender_organization_id=org and d.supplier_id is null and ds.revoked_at is null),''metrics'',metrics');
 body:=replace(body,'s.shared_at,d.name,d.kind,d.mime_type,d.storage_path,o.legal_name sender_name','s.shared_at,d.name,d.kind,d.mime_type,d.storage_path,o.legal_name sender_name,coalesce((select verification_status from relay_private.shared_document_reviews where share_id=s.id),''unverified'') review_status');
 body:=replace(body,'order by s.shared_at desc,s.id limit 50 offset skip','order by s.shared_at desc,s.id limit 50 offset case when detail_tab=''Documents'' then detail_skip else 0 end');
 body:=replace(body,'when ''Documents'' then (select count(*) from relay_private.active_documents where organization_id=org and supplier_id=selected)', 'when ''Documents'' then greatest((select count(*) from relay_private.active_documents where organization_id=org and supplier_id=selected),(select count(*) from public.document_shares ds join relay_private.active_documents d on d.id=ds.document_id where ds.recipient_organization_id=org and ds.revoked_at is null and relay_private.share_active(ds.id) and ds.sender_organization_id=(select source_organization_id from public.suppliers where organization_id=org and id=selected)))');
 body:=replace(body,'select count(*) into total from (select title,created_at from public.workspace_events where organization_id=org union select title,occurred_at from public.activities where organization_id=org) a;', 'select count(*) into total from (select id from public.workspace_events where organization_id=org union all select a.id from public.activities a where a.organization_id=org and not exists(select 1 from public.workspace_events w where w.organization_id=a.organization_id and w.title=a.title and w.created_at=a.occurred_at)) a;');
 old_fragment:='select id,organization_id,actor_id,title,detail,created_at from public.workspace_events where organization_id=org union select id,organization_id,actor_id,title,description,occurred_at from public.activities where organization_id=org';
 if position(old_fragment in body)=0 then raise exception 'Unexpected snapshot event query.';end if;
 body:=replace(body,old_fragment,
 'select w.id,w.organization_id,coalesce(w.actor_id,a.actor_id) actor_id,w.title,w.detail,w.created_at,coalesce(w.target_type,case when a.kind=''request'' then ''request'' when a.kind=''document'' then ''document'' when a.kind is not null then ''supplier'' end) target_type,w.target_id,coalesce(w.supplier_id,a.supplier_id) supplier_id,(select legal_name from public.suppliers where id=coalesce(w.supplier_id,a.supplier_id) and organization_id=org) supplier_name,(select full_name from public.profiles where id=coalesce(w.actor_id,a.actor_id)) actor_name,relay_private.supplier_active(org,coalesce(w.supplier_id,a.supplier_id)) supplier_available from public.workspace_events w left join lateral(select v.kind,v.supplier_id,v.actor_id from public.activities v where v.organization_id=w.organization_id and v.title=w.title and v.occurred_at=w.created_at order by v.id limit 1) a on true where w.organization_id=org union all select a.id,a.organization_id,a.actor_id,a.title,a.description,a.occurred_at,case when a.kind=''request'' then ''request'' when a.kind=''document'' then ''document'' else ''supplier'' end,null::uuid,a.supplier_id,(select legal_name from public.suppliers where id=a.supplier_id and organization_id=org),(select full_name from public.profiles where id=a.actor_id),relay_private.supplier_active(org,a.supplier_id) from public.activities a where a.organization_id=org and not exists(select 1 from public.workspace_events w where w.organization_id=a.organization_id and w.title=a.title and w.created_at=a.occurred_at)');
 execute body;
end $migration$;

-- Orphan cleanup must check metadata without RLS hiding trashed documents.
create function relay_private.file_is_orphan(path text) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from public.documents where storage_path=path)$$;
revoke all on function relay_private.file_is_orphan(text) from public,anon;
grant execute on function relay_private.file_is_orphan(text) to authenticated;
create policy only_real_orphans_removed on storage.objects as restrictive for delete to authenticated using(bucket_id<>'relay-documents' or relay_private.file_is_orphan(name));
create policy no_trashed_file_edits on storage.objects as restrictive for update to authenticated using(bucket_id<>'relay-documents' or relay_private.file_not_trashed(name)) with check(bucket_id<>'relay-documents' or relay_private.file_not_trashed(name));

-- Document selection uses your original company library, never collected supplier files.
do $migration$
declare body text;
begin
 body:=pg_get_functiondef('relay_private.exchange_api(text,jsonb)'::regprocedure);
 body:=replace(body,'where organization_id=org and name ilike', 'where organization_id=org and supplier_id is null and verification_status<>''rejected'' and name ilike');
 execute body;
end $migration$;
create function relay_private.document_upload_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Guest intake already records its submission as a single activity; do not duplicate each file.
 if new.intake_link_id is null then
  insert into public.workspace_events(organization_id,actor_id,title,detail,target_type,target_id,supplier_id) values(new.organization_id,new.uploaded_by,'Document added',new.name,'document',new.id,new.supplier_id);
 end if;
 return new;
end $$;
revoke all on function relay_private.document_upload_event() from public,anon,authenticated;
create trigger document_upload_event after insert on public.documents for each row execute function relay_private.document_upload_event();

create index documents_reviewed_by_idx on public.documents(reviewed_by) where reviewed_by is not null;

create index document_shares_received_active_idx on public.document_shares(recipient_organization_id,sender_organization_id,shared_at desc,id) where revoked_at is null;

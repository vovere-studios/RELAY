-- Company-to-company requests keep one Supabase account/database and explicit consent.
create table relay_private.exchange_requests (
 request_id uuid primary key references public.data_requests(id) on delete cascade,
 requester_org uuid not null references public.organizations(id),
 recipient_org uuid not null references public.organizations(id),
 supplier_id uuid not null references public.suppliers(id),
 submitted_at timestamptz, submitted_by uuid references auth.users(id), document_ids uuid[] not null default '{}',
 check(requester_org<>recipient_org)
);
alter table relay_private.exchange_requests enable row level security;
revoke all on relay_private.exchange_requests from public,anon,authenticated;
create index exchange_requester_idx on relay_private.exchange_requests(requester_org,request_id);
create index exchange_recipient_idx on relay_private.exchange_requests(recipient_org,request_id);
create index exchange_supplier_idx on relay_private.exchange_requests(supplier_id);
create index exchange_submitter_idx on relay_private.exchange_requests(submitted_by);
create function relay_private.route_company_request() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.suppliers;
begin
 select c.* into s from public.suppliers c join public.supplier_relationships r on r.supplier_id=c.id and r.organization_id=c.organization_id where r.id=new.relationship_id and r.organization_id=new.organization_id;
 if s.source_organization_id is not null then
  insert into relay_private.exchange_requests(request_id,requester_org,recipient_org,supplier_id) values(new.id,new.organization_id,s.source_organization_id,s.id);
  insert into public.workspace_events(organization_id,actor_id,title,detail) values(s.source_organization_id,auth.uid(),'New document request', (select legal_name from public.organizations where id=new.organization_id)||': '||new.title);
 end if;
 return new;
end $$;
revoke all on function relay_private.route_company_request() from public,anon,authenticated;
create trigger route_company_request after insert on public.data_requests for each row execute function relay_private.route_company_request();
create table relay_private.link_share_receipts (
 link_id uuid references public.upload_links(id) on delete cascade, sender_org uuid references public.organizations(id),
 document_ids uuid[] not null, created_at timestamptz not null default now(), primary key(link_id,sender_org)
);
alter table relay_private.link_share_receipts enable row level security;
revoke all on relay_private.link_share_receipts from public,anon,authenticated;
create index link_receipts_sender_idx on relay_private.link_share_receipts(sender_org);
create function relay_private.exchange_api(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='8s' set lock_timeout='3s' as $$
declare org uuid:=(payload->>'organization_id')::uuid; target uuid:=(payload->>'request_id')::uuid;
 er relay_private.exchange_requests; l public.upload_links; doc_ids uuid[]; d uuid; receiver uuid; result jsonb;
 pg integer:=greatest(0,least(coalesce((payload->>'page')::int,0),100000)); term text:=left(coalesce(payload->>'query',''),100);
begin
 if auth.uid() is null then raise exception 'Sign in to use your workspace documents.' using errcode='42501';end if;
 if action='organizations' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',legal_name) order by legal_name,id) from public.organizations where (owner_id=auth.uid() or exists(select 1 from public.organization_members m where m.organization_id=organizations.id and m.user_id=auth.uid() and m.role in ('owner','admin'))) and relay_private.can_access_org(id,true)),'[]');
 end if;
 if not relay_private.can_access_org(org,action in ('respond','share_link')) then raise exception 'Company access denied' using errcode='42501';end if;
 if action='list' then
  select jsonb_build_object('total',(select count(*) from relay_private.exchange_requests e where (requester_org=org or recipient_org=org) and relay_private.supplier_active(e.requester_org,e.supplier_id) and (coalesce(payload->>'direction','')='' or (payload->>'direction'='received' and e.recipient_org=org) or (payload->>'direction'='sent' and e.requester_org=org)) and (nullif(payload->>'supplier_id','') is null or e.supplier_id=(payload->>'supplier_id')::uuid)), 'items',coalesce(jsonb_agg(to_jsonb(r)),'[]')) into result
  from (select e.request_id,e.requester_org,e.recipient_org,e.supplier_id,e.submitted_at,e.document_ids,d.title,d.due_at,d.requested_at,d.status,a.legal_name requester_name,b.legal_name recipient_name,
    coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'storage_path',x.storage_path,'revoked',ds.revoked_at is not null)) from public.documents x join public.document_shares ds on ds.document_id=x.id and ds.recipient_organization_id=e.requester_org where x.id=any(e.document_ids)),'[]') documents
    from relay_private.exchange_requests e join public.data_requests d on d.id=e.request_id join public.organizations a on a.id=e.requester_org join public.organizations b on b.id=e.recipient_org
    where (e.requester_org=org or e.recipient_org=org) and relay_private.supplier_active(e.requester_org,e.supplier_id)
      and (coalesce(payload->>'direction','')='' or (payload->>'direction'='received' and e.recipient_org=org) or (payload->>'direction'='sent' and e.requester_org=org))
      and (nullif(payload->>'supplier_id','') is null or e.supplier_id=(payload->>'supplier_id')::uuid)
    order by (e.submitted_at is null) desc,d.requested_at desc,d.id limit 50 offset pg*50) r;
  return result;
 elsif action='documents' then
  select coalesce(jsonb_agg(to_jsonb(d)),'[]') into result from (select id,name,kind,uploaded_at from relay_private.active_documents where organization_id=org and name ilike '%'||term||'%' order by uploaded_at desc,id limit 50 offset pg*50) d;
  return result;
 elsif action not in ('respond','share_link') then raise exception 'Unknown exchange action';end if;
 select array_agg(distinct value::uuid) into doc_ids from jsonb_array_elements_text(coalesce(payload->'document_ids','[]'));
 if coalesce(cardinality(doc_ids),0) not between 1 and 20 then raise exception 'Choose between one and twenty documents.';end if;
 if action='respond' then
  select * into er from relay_private.exchange_requests where request_id=target and recipient_org=org for update;
  if not found or not relay_private.supplier_active(er.requester_org,er.supplier_id) then raise exception 'This request is no longer available.' using errcode='42501';end if;
  if er.submitted_at is not null then return jsonb_build_object('sent',true);end if;
  receiver:=er.requester_org;
 else
  if length(coalesce(payload->>'token','')) not between 32 and 200 then raise exception 'This link is unavailable.';end if;
  select * into l from public.upload_links where token_hash=encode(extensions.digest(payload->>'token','sha256'),'hex') for update;
  if not found or l.revoked_at is not null or l.expires_at<now() or not relay_private.supplier_active(l.organization_id,l.supplier_id) then raise exception 'This link is unavailable.';end if;
  if exists(select 1 from relay_private.link_share_receipts where link_id=l.id and sender_org=org) then return jsonb_build_object('sent',true);end if;
  if l.uploads_used+cardinality(doc_ids)>l.max_files then raise exception 'The link cannot accept this many documents.';end if;
  if exists(select 1 from public.suppliers where id=l.supplier_id and source_organization_id is not null and source_organization_id<>org) then raise exception 'Use the company this request was addressed to.' using errcode='42501';end if;
  receiver:=l.organization_id;
 end if;
 if receiver=org then raise exception 'Choose your sending company, not the receiving company.';end if;
 foreach d in array doc_ids loop
  if not exists(select 1 from relay_private.active_documents where id=d and organization_id=org) then raise exception 'Only your active company documents can be sent.' using errcode='42501';end if;
  if exists(select 1 from public.document_shares where document_id=d and recipient_organization_id=receiver and revoked_at is not null) then raise exception 'Access to one selected document was revoked. Review it in Documents before sharing again.';end if;
  insert into public.document_shares(document_id,sender_organization_id,recipient_organization_id,shared_by) values(d,org,receiver,auth.uid()) on conflict(document_id,recipient_organization_id) do nothing;
 end loop;
 if action='respond' then
  update relay_private.exchange_requests set submitted_at=now(),submitted_by=auth.uid(),document_ids=doc_ids where request_id=target;
  update public.data_requests set status='received' where id=target;
 else
  insert into relay_private.link_share_receipts(link_id,sender_org,document_ids) values(l.id,org,doc_ids);
  update public.upload_links set uploads_used=uploads_used+cardinality(doc_ids) where id=l.id;
  if l.request_id is not null then update public.data_requests set status='received' where id=l.request_id;end if;
 end if;
 insert into public.workspace_events(organization_id,actor_id,title,detail) values(receiver,auth.uid(),'Documents received',cardinality(doc_ids)||' documents shared by '||(select legal_name from public.organizations where id=org));
 insert into public.workspace_events(organization_id,actor_id,title,detail) values(org,auth.uid(),'Documents sent',cardinality(doc_ids)||' documents shared with '||(select legal_name from public.organizations where id=receiver));
 return jsonb_build_object('sent',true);
end $$;
revoke all on function relay_private.exchange_api(text,jsonb) from public,anon;
grant execute on function relay_private.exchange_api(text,jsonb) to authenticated;
create function public.relay_exchange_api(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select relay_private.exchange_api(action,payload)$$;
revoke all on function public.relay_exchange_api(text,jsonb) from public,anon;
grant execute on function public.relay_exchange_api(text,jsonb) to authenticated;

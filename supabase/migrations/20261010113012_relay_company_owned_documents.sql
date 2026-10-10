-- Company-owned files use organization/company/document/file paths, never a synthetic supplier.
alter table public.documents alter column supplier_id drop not null;
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.documents'::regclass and contype='c' and pg_get_constraintdef(oid) like '%split_part%' loop
 execute format('alter table public.documents drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.documents add constraint documents_scoped_storage_path check (
 split_part(storage_path,'/',1)=organization_id::text and split_part(storage_path,'/',3)=id::text
 and ((supplier_id is null and split_part(storage_path,'/',2)='company') or (supplier_id is not null and split_part(storage_path,'/',2)=supplier_id::text))
);
create policy relay_company_files_read on storage.objects for select to authenticated using (
 bucket_id='relay-documents' and split_part(name,'/',2)='company' and exists(select 1 from public.organizations o where o.id::text=split_part(name,'/',1) and relay_private.can_access_org(o.id))
);
create policy relay_company_files_create on storage.objects for insert to authenticated with check (
 bucket_id='relay-documents' and split_part(name,'/',2)='company' and exists(select 1 from public.organizations o where o.id::text=split_part(name,'/',1) and relay_private.can_access_org(o.id,true))
);
create policy relay_company_orphan_files_delete on storage.objects for delete to authenticated using (
 bucket_id='relay-documents' and split_part(name,'/',2)='company' and exists(select 1 from public.organizations o where o.id::text=split_part(name,'/',1) and relay_private.can_access_org(o.id,true)) and not exists(select 1 from public.documents d where d.storage_path=name)
);

-- Delivery addresses never become an authenticated-client RPC response.
create function relay_private.exchange_delivery(org uuid, actor uuid, token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.upload_links; receipt relay_private.link_share_receipts; sender text; receiver text; recipients jsonb; sender_email text;
begin
 if actor is null or not exists(select 1 from public.organizations o where o.id=org and (o.owner_id=actor or exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=actor and m.role in ('owner','admin')))) then raise exception 'Company access denied' using errcode='42501';end if;
 select * into l from public.upload_links where token_hash=encode(extensions.digest(token,'sha256'),'hex');
 select * into receipt from relay_private.link_share_receipts where link_id=l.id and sender_org=org;
 if receipt.link_id is null then raise exception 'A completed submission is required.';end if;
 select legal_name into sender from public.organizations where id=org;
 select legal_name into receiver from public.organizations where id=l.organization_id;
 select email into sender_email from auth.users where id=actor and email_confirmed_at is not null;
 select coalesce(jsonb_agg(email),'[]') into recipients from (
 select distinct u.email from auth.users u where u.email_confirmed_at is not null and (exists(select 1 from public.organizations o where o.id=l.organization_id and o.owner_id=u.id) or exists(select 1 from public.organization_members m where m.organization_id=l.organization_id and m.user_id=u.id and m.role in ('owner','admin'))) order by u.email limit 10
 ) addresses;
 return jsonb_build_object('receipt',l.id::text||'-'||org::text,'sender',sender,'receiver',receiver,'sender_email',sender_email,'recipient_emails',recipients,'count',cardinality(receipt.document_ids));
end $$;
revoke all on function relay_private.exchange_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function relay_private.exchange_delivery(uuid,uuid,text) to service_role;
create function public.relay_exchange_delivery(org uuid,actor uuid,token text) returns jsonb language sql security invoker set search_path='' as $$select relay_private.exchange_delivery(org,actor,token)$$;
revoke all on function public.relay_exchange_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.relay_exchange_delivery(uuid,uuid,text) to service_role;

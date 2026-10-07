create or replace function public.relay_intake_api(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare link public.upload_links; reservation public.intake_reservations; item jsonb; target uuid; path text; files integer; result jsonb;
begin
 if action in ('info','reserve') then
  if coalesce(payload->>'token','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid upload link'; end if;
  select * into link from public.upload_links where token_hash=encode(extensions.digest(payload->>'token','sha256'),'hex') for update;
  if link.id is null or link.revoked_at is not null or link.expires_at<now() then raise exception 'This link is invalid, expired or revoked'; end if;
  -- Serialize on the link before touching reservations, including finish/cancel.
  with stale as (update public.intake_reservations set status='failed' where link_id=link.id and status='pending' and created_at<now()-interval '10 minutes' returning file_count)
  select coalesce(sum(file_count),0)::integer into files from stale;
  if files>0 then update public.upload_links set uploads_used=greatest(0,uploads_used-files) where id=link.id returning * into link; end if;
  if link.uploads_used>=link.max_files then raise exception 'This upload link is full'; end if;
  if action='info' then
   return jsonb_build_object('company',(select legal_name from public.organizations where id=link.organization_id),'supplier',(select legal_name from public.suppliers where id=link.supplier_id),'title',link.title,'expires_at',link.expires_at,'remaining',link.max_files-link.uploads_used);
  end if;
  files := (payload->>'file_count')::integer;
  if files not between 1 and 5 or link.uploads_used+files>link.max_files then raise exception 'This link cannot accept that many files'; end if;
  update public.upload_links set uploads_used=uploads_used+files where id=link.id;
  insert into public.intake_reservations(link_id,file_count) values(link.id,files) returning id into target;
  return jsonb_build_object('reservation_id',target,'organization_id',link.organization_id,'supplier_id',link.supplier_id);
 end if;
 select * into reservation from public.intake_reservations where id=(payload->>'reservation_id')::uuid;
 if reservation.id is null then raise exception 'Submission is no longer pending'; end if;
 select * into link from public.upload_links where id=reservation.link_id for update;
 select * into reservation from public.intake_reservations where id=reservation.id for update;
 if reservation.status<>'pending' then raise exception 'Submission is no longer pending'; end if;
 if action='cancel' then
  update public.intake_reservations set status='failed' where id=reservation.id;
  update public.upload_links set uploads_used=greatest(0,uploads_used-reservation.file_count) where id=link.id;
  return jsonb_build_object('cancelled',true);
 elsif action='finish' then
  if link.revoked_at is not null or link.expires_at<now() then raise exception 'This upload link is no longer active'; end if;
  if reservation.created_at<now()-interval '10 minutes' then raise exception 'Submission timed out'; end if;
  if jsonb_array_length(payload->'files')<>reservation.file_count then raise exception 'Submission file count mismatch'; end if;
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 100 or coalesce(payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter your name and email'; end if;
  for item in select value from jsonb_array_elements(payload->'files') loop
   target := (item->>'id')::uuid; path := item->>'path';
   if split_part(path,'/',1)<>link.organization_id::text or split_part(path,'/',2)<>link.supplier_id::text or split_part(path,'/',3)<>target::text then raise exception 'Invalid submission path'; end if;
   insert into public.documents(id,organization_id,supplier_id,name,kind,mime_type,storage_path,uploaded_by,submitted_by_name,submitted_by_email,intake_link_id) values(target,link.organization_id,link.supplier_id,item->>'name',item->>'kind',item->>'mime_type',path,null,trim(payload->>'name'),lower(trim(payload->>'email')),link.id);
  end loop;
  update public.intake_reservations set status='complete' where id=reservation.id;
  if link.request_id is not null then update public.data_requests set status='received' where id=link.request_id; end if;
  insert into public.activities(organization_id,supplier_id,actor_id,title,description,kind) values(link.organization_id,link.supplier_id,link.created_by,'Supplier documents received',reservation.file_count||' files submitted by '||trim(payload->>'name'),'document');
  insert into public.workspace_events(organization_id,title,detail) values(link.organization_id,'Supplier documents received',link.title);
  return jsonb_build_object('received',true,'files',reservation.file_count);
 end if;
 raise exception 'Unknown intake action';
end $$;

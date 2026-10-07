create or replace function relay_private.workspace_api(action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); org uuid; owner uuid; is_owner boolean; token text; target uuid; invite public.team_invitations; result jsonb; company public.company_directory; supplier uuid; doc public.documents; recipient uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if action='claim_invite' then
  select * into invite from public.team_invitations where token_hash=encode(extensions.digest(coalesce(payload->>'token',''),'sha256'),'hex') for update;
  if invite.id is null or invite.revoked_at is not null or invite.expires_at<now() or invite.accepted_by is not null then raise exception 'This invitation is invalid, expired or already used'; end if;
  if not exists(select 1 from auth.users where id=uid and lower(email)=invite.email and email_confirmed_at is not null) then raise exception 'Sign in with the confirmed email address that was invited' using errcode='42501'; end if;
  if exists(select 1 from public.organizations where id=invite.organization_id and owner_id=uid) then raise exception 'You already own this workspace'; end if;
  insert into public.organization_members(organization_id,user_id,role) values(invite.organization_id,uid,invite.role) on conflict(organization_id,user_id) do nothing;
  update public.team_invitations set accepted_by=uid where id=invite.id;
  insert into public.workspace_events(organization_id,actor_id,title) values(invite.organization_id,uid,'Team invitation accepted');
  return jsonb_build_object('organization_id',invite.organization_id);
 end if;
 if action='directory' then
  return coalesce((select jsonb_agg(to_jsonb(d)) from (select organization_id,display_name,country_code,website,description from public.company_directory where listed and display_name ilike '%'||left(coalesce(payload->>'query',''),100)||'%' order by display_name limit 50) d),'[]'::jsonb);
 end if;
 org := (payload->>'organization_id')::uuid;
 if not relay_private.can_access_org(org) then raise exception 'Company access denied' using errcode='42501'; end if;
 select owner_id into owner from public.organizations where id=org; is_owner := owner=uid;
 if action='team' then
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select u.id,u.email,coalesce(p.full_name,'') full_name,'owner'::text role from auth.users u left join public.profiles p on p.id=u.id where u.id=owner union all select u.id,u.email,coalesce(p.full_name,''),m.role from public.organization_members m join auth.users u on u.id=m.user_id left join public.profiles p on p.id=u.id where m.organization_id=org and m.user_id<>owner) t),'[]'::jsonb);
 end if;
 if action='received_shares' then
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select s.id,s.document_id,s.shared_at,d.name,d.kind,d.mime_type,d.storage_path,o.legal_name as sender_name from public.document_shares s join public.documents d on d.id=s.document_id join public.organizations o on o.id=s.sender_organization_id where s.recipient_organization_id=org and s.revoked_at is null order by s.shared_at desc) t),'[]'::jsonb);
 end if;
 if not relay_private.can_access_org(org,true) then raise exception 'An owner or administrator must perform this action' using errcode='42501'; end if;
 if action='settings' then
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 160 then raise exception 'Enter a company name'; end if;
  update public.organizations set legal_name=trim(payload->>'name'),country_code=upper(coalesce(payload->>'country_code','')),website=left(coalesce(payload->>'website',''),255),registration_number=left(coalesce(payload->>'registration_number',''),100) where id=org;
  insert into public.company_directory(organization_id,display_name,country_code,website,description,listed) values(org,trim(payload->>'name'),upper(coalesce(payload->>'country_code','')),left(coalesce(payload->>'website',''),255),left(coalesce(payload->>'description',''),1000),coalesce((payload->>'listed')::boolean,false)) on conflict(organization_id) do update set display_name=excluded.display_name,country_code=excluded.country_code,website=excluded.website,description=excluded.description,listed=excluded.listed;
  insert into public.workspace_settings(organization_id,email_updates) values(org,coalesce((payload->>'email_updates')::boolean,true)) on conflict(organization_id) do update set email_updates=excluded.email_updates;
  return jsonb_build_object('saved',true);
 elsif action='invite' then
  if payload->>'role' not in ('admin','member') or (payload->>'role'='admin' and not is_owner) then raise exception 'Only the owner can invite administrators' using errcode='42501'; end if;
  if exists(select 1 from auth.users u where lower(u.email)=lower(trim(payload->>'email')) and (u.id=owner or exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=u.id))) then raise exception 'This person already belongs to the workspace'; end if;
  if (select count(*) from public.team_invitations where organization_id=org and created_at>now()-interval '1 hour')>=30 then raise exception 'Invitation limit reached. Try again later'; end if;
  token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.team_invitations(organization_id,email,role,token_hash,created_by) values(org,lower(trim(payload->>'email')),payload->>'role',encode(extensions.digest(token,'sha256'),'hex'),uid) returning id into target;
  return jsonb_build_object('id',target,'token',token);
 elsif action='revoke_invite' then
  update public.team_invitations set revoked_at=now() where id=(payload->>'id')::uuid and organization_id=org and accepted_by is null;
  return jsonb_build_object('revoked',true);
 elsif action='member_role' then
  if not is_owner then raise exception 'Only the owner can manage team access' using errcode='42501'; end if;
  target := (payload->>'user_id')::uuid;
  if target=owner then raise exception 'The owner cannot be removed or downgraded'; end if;
  if payload->>'role'='remove' then delete from public.organization_members where organization_id=org and user_id=target;
  elsif payload->>'role' in ('admin','member') then update public.organization_members set role=payload->>'role' where organization_id=org and user_id=target;
  else raise exception 'Unknown role'; end if;
  insert into public.workspace_events(organization_id,actor_id,title) values(org,uid,'Team access updated');
  return jsonb_build_object('saved',true);
 elsif action='upload_link' then
  supplier := (payload->>'supplier_id')::uuid;
  if not exists(select 1 from public.suppliers where organization_id=org and id=supplier) then raise exception 'Supplier not found'; end if;
  if payload->>'request_id' is not null and not exists(select 1 from public.data_requests r join public.supplier_relationships c on c.id=r.relationship_id and c.organization_id=r.organization_id where r.id=(payload->>'request_id')::uuid and r.organization_id=org and c.supplier_id=supplier) then raise exception 'Request does not belong to this supplier'; end if;
  if (select count(*) from public.upload_links where organization_id=org and created_at>now()-interval '1 hour')>=30 then raise exception 'Link limit reached. Try again later'; end if;
  token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.upload_links(organization_id,supplier_id,request_id,title,token_hash,created_by) values(org,supplier,nullif(payload->>'request_id','')::uuid,trim(payload->>'title'),encode(extensions.digest(token,'sha256'),'hex'),uid) returning id into target;
  return jsonb_build_object('id',target,'token',token);
 elsif action='revoke_link' then
  update public.upload_links set revoked_at=now() where id=(payload->>'id')::uuid and organization_id=org;
  return jsonb_build_object('revoked',true);
 elsif action='connect_company' then
  select * into company from public.company_directory where organization_id=(payload->>'company_id')::uuid and listed;
  if company.organization_id is null or company.organization_id=org then raise exception 'Choose a listed company outside your workspace'; end if;
  if exists(select 1 from public.suppliers where organization_id=org and source_organization_id=company.organization_id) then raise exception 'This company is already connected'; end if;
  -- Atomic supplier initialization, with the authenticated caller's context.
  supplier := public.add_supplier_connection(org,company.display_name,company.country_code,company.country_code,company.description,'');
  update public.suppliers set source_organization_id=company.organization_id,website=company.website where id=supplier;
  return jsonb_build_object('supplier_id',supplier);
 elsif action='share_documents' then
  recipient := (payload->>'recipient_id')::uuid;
  if recipient=org or not exists(select 1 from public.company_directory where organization_id=recipient and listed) then raise exception 'Choose a listed recipient company'; end if;
  if jsonb_array_length(coalesce(payload->'document_ids','[]')) not between 1 and 20 then raise exception 'Choose between one and twenty documents'; end if;
  for target in select value::uuid from jsonb_array_elements_text(payload->'document_ids') loop
   select * into doc from public.documents where id=target and organization_id=org;
   if doc.id is null then raise exception 'You can only share your company documents' using errcode='42501'; end if;
   insert into public.document_shares(document_id,sender_organization_id,recipient_organization_id,shared_by) values(doc.id,org,recipient,uid) on conflict(document_id,recipient_organization_id) do update set revoked_at=null,shared_at=now(),shared_by=uid;
  end loop;
  insert into public.workspace_events(organization_id,actor_id,title) values(recipient,uid,'Documents shared with your company');
  return jsonb_build_object('shared',true);
 elsif action='revoke_share' then
  update public.document_shares set revoked_at=now() where id=(payload->>'id')::uuid and sender_organization_id=org;
  return jsonb_build_object('revoked',true);
 elsif action='record_certificate' then
  select * into doc from public.documents where id=(payload->>'document_id')::uuid and organization_id=org and supplier_id=(payload->>'supplier_id')::uuid and kind='certificate';
  if doc.id is null then raise exception 'Choose a certificate belonging to this supplier'; end if;
  if length(trim(coalesce(payload->>'standard',''))) not between 1 and 100 or (payload->>'valid_until')::date < (payload->>'valid_from')::date then raise exception 'Enter a standard and a valid date range'; end if;
  insert into public.certificates(organization_id,supplier_id,document_id,standard,issuer,valid_from,valid_until) values(org,doc.supplier_id,doc.id,trim(payload->>'standard'),coalesce(payload->>'issuer',''),(payload->>'valid_from')::date,(payload->>'valid_until')::date);
  update public.documents set verification_status='verified' where id=doc.id;
  insert into public.workspace_events(organization_id,actor_id,title) values(org,uid,'Certificate details reviewed');
  return jsonb_build_object('saved',true);
 elsif action='review_requirement' then
  target := (payload->>'id')::uuid;
  if not exists(select 1 from public.requirements where id=target and organization_id=org) then raise exception 'Requirement not found'; end if;
  if payload->>'status'='satisfied' and nullif(payload->>'document_id','') is null and exists(select 1 from public.requirements where id=target and kind='document') then raise exception 'Supporting evidence is required'; end if;
  if payload->>'status' not in ('satisfied','missing') then raise exception 'Unknown review status'; end if;
  if payload->>'document_id' is not null and not exists(select 1 from public.documents d join public.requirements q on q.organization_id=d.organization_id join public.supplier_relationships r on r.id=q.relationship_id and r.supplier_id=d.supplier_id where q.id=target and q.organization_id=org and d.id=(payload->>'document_id')::uuid) then raise exception 'Document does not belong to this requirement supplier'; end if;
  update public.requirements set status=payload->>'status',document_id=nullif(payload->>'document_id','')::uuid where id=target and organization_id=org;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Unknown workspace action';
end $$;

create policy relay_orphan_files_delete on storage.objects for delete to authenticated using(bucket_id='relay-documents' and exists(select 1 from public.suppliers s where s.organization_id::text=split_part(name,'/',1) and s.id::text=split_part(name,'/',2) and relay_private.can_access_org(s.organization_id,true)) and not exists(select 1 from public.documents d where d.storage_path=name));
revoke insert on public.documents from authenticated;
grant insert(id,organization_id,supplier_id,name,kind,mime_type,storage_path,uploaded_by,verification_status) on public.documents to authenticated;

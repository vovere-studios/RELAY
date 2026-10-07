-- Relay: consent-based discovery, team invitations, document sharing and intake.
-- Secrets are hashed. Only narrow, authorized routines administer membership.
create table public.company_directory (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 country_code text not null default '', website text not null default '',
 description text not null default '' check(length(description)<=1000), listed boolean not null default false
);
create table public.workspace_settings (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 email_updates boolean not null default true
);
create table public.team_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 role text not null check(role in ('admin','member')), token_hash text not null unique,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days', revoked_at timestamptz, accepted_by uuid references auth.users(id)
);
create index team_invitations_org_idx on public.team_invitations(organization_id);
create index team_invitations_creator_idx on public.team_invitations(created_by);
create index team_invitations_accepted_idx on public.team_invitations(accepted_by);
create table public.upload_links (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, request_id uuid, title text not null check(length(trim(title)) between 1 and 160),
 token_hash text not null unique, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '14 days',
 revoked_at timestamptz, uploads_used integer not null default 0 check(uploads_used>=0),
 max_files integer not null default 5 check(max_files between 1 and 20),
 foreign key(organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade,
 foreign key(organization_id,request_id) references public.data_requests(organization_id,id) on delete cascade
);
create index upload_links_supplier_idx on public.upload_links(organization_id,supplier_id);
create index upload_links_request_idx on public.upload_links(organization_id,request_id);
create index upload_links_creator_idx on public.upload_links(created_by);
create table public.intake_reservations (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.upload_links(id) on delete cascade,
 file_count integer not null check(file_count between 1 and 5), status text not null default 'pending' check(status in ('pending','complete','failed')),
 created_at timestamptz not null default now()
);
create index intake_reservations_link_idx on public.intake_reservations(link_id);
alter table public.documents alter column uploaded_by drop not null;
alter table public.documents add column submitted_by_name text check(length(submitted_by_name)<=100);
alter table public.documents add column submitted_by_email text check(length(submitted_by_email)<=254);
alter table public.documents add column intake_link_id uuid references public.upload_links(id);
create index documents_intake_link_idx on public.documents(intake_link_id);
alter table public.suppliers add column source_organization_id uuid references public.organizations(id);
create unique index suppliers_source_org_idx on public.suppliers(organization_id,source_organization_id) where source_organization_id is not null;
create table public.document_shares (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.documents(id) on delete cascade,
 sender_organization_id uuid not null references public.organizations(id) on delete cascade,
 recipient_organization_id uuid not null references public.organizations(id) on delete cascade,
 shared_by uuid not null references auth.users(id), shared_at timestamptz not null default now(), revoked_at timestamptz,
 unique(document_id,recipient_organization_id), check(sender_organization_id<>recipient_organization_id)
);
create index shares_sender_idx on public.document_shares(sender_organization_id);
create index shares_recipient_idx on public.document_shares(recipient_organization_id);
create index shares_actor_idx on public.document_shares(shared_by);
create table public.workspace_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_id uuid references auth.users(id), title text not null, detail text not null default '', created_at timestamptz not null default now()
);
create index workspace_events_org_date_idx on public.workspace_events(organization_id,created_at desc);
create index workspace_events_actor_idx on public.workspace_events(actor_id);

do $$ declare t text; begin
 foreach t in array array['company_directory','workspace_settings','team_invitations','upload_links','intake_reservations','document_shares','workspace_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
create policy directory_read on public.company_directory for select to authenticated using(listed or relay_private.can_access_org(organization_id));
grant select on public.company_directory to authenticated;
create policy settings_read on public.workspace_settings for select to authenticated using(relay_private.can_access_org(organization_id));
grant select on public.workspace_settings to authenticated;
create policy invitations_read on public.team_invitations for select to authenticated using(relay_private.can_access_org(organization_id,true));
grant select(id,organization_id,email,role,created_by,created_at,expires_at,revoked_at,accepted_by) on public.team_invitations to authenticated;
create policy links_read on public.upload_links for select to authenticated using(relay_private.can_access_org(organization_id,true));
grant select(id,organization_id,supplier_id,request_id,title,created_by,created_at,expires_at,revoked_at,uploads_used,max_files) on public.upload_links to authenticated;
create policy shares_read on public.document_shares for select to authenticated using(relay_private.can_access_org(sender_organization_id) or relay_private.can_access_org(recipient_organization_id));
grant select on public.document_shares to authenticated;
create policy events_read on public.workspace_events for select to authenticated using(relay_private.can_access_org(organization_id));
grant select on public.workspace_events to authenticated;
-- Explicit sharing grants access only to the selected document, not its company's other records.
create policy documents_shared_read on public.documents for select to authenticated using(exists(select 1 from public.document_shares s where s.document_id=documents.id and s.revoked_at is null and relay_private.can_access_org(s.recipient_organization_id)));
create policy relay_shared_files_read on storage.objects for select to authenticated using(bucket_id='relay-documents' and exists(select 1 from public.documents d join public.document_shares s on s.document_id=d.id where d.storage_path=storage.objects.name and s.revoked_at is null and relay_private.can_access_org(s.recipient_organization_id)));

create function relay_private.workspace_api(action text, payload jsonb)
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
 elsif action='review_requirement' then
  target := (payload->>'id')::uuid;
  if payload->>'status' not in ('satisfied','missing') then raise exception 'Unknown review status'; end if;
  if payload->>'document_id' is not null and not exists(select 1 from public.documents d join public.requirements q on q.organization_id=d.organization_id join public.supplier_relationships r on r.id=q.relationship_id and r.supplier_id=d.supplier_id where q.id=target and q.organization_id=org and d.id=(payload->>'document_id')::uuid) then raise exception 'Document does not belong to this requirement supplier'; end if;
  update public.requirements set status=payload->>'status',document_id=nullif(payload->>'document_id','')::uuid where id=target and organization_id=org;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Unknown workspace action';
end $$;
revoke all on function relay_private.workspace_api(text,jsonb) from public,anon;
grant execute on function relay_private.workspace_api(text,jsonb) to authenticated;
create function public.relay_workspace_api(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select relay_private.workspace_api(action,payload)$$;
revoke all on function public.relay_workspace_api(text,jsonb) from public,anon;
grant execute on function public.relay_workspace_api(text,jsonb) to authenticated;

-- Called only by a server-side Edge Function. No anonymous database access.
create function public.relay_intake_api(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare link public.upload_links; reservation public.intake_reservations; item jsonb; target uuid; path text; files integer; result jsonb;
begin
 if action in ('info','reserve') then
  if coalesce(payload->>'token','') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid upload link'; end if;
  select * into link from public.upload_links where token_hash=encode(extensions.digest(payload->>'token','sha256'),'hex') for update;
  if link.id is null or link.revoked_at is not null or link.expires_at<now() or link.uploads_used>=link.max_files then raise exception 'This link is invalid, expired, revoked or full'; end if;
  if action='info' then
   return jsonb_build_object('company',(select legal_name from public.organizations where id=link.organization_id),'supplier',(select legal_name from public.suppliers where id=link.supplier_id),'title',link.title,'expires_at',link.expires_at,'remaining',link.max_files-link.uploads_used);
  end if;
  files := (payload->>'file_count')::integer;
  if files not between 1 and 5 or link.uploads_used+files>link.max_files then raise exception 'This link cannot accept that many files'; end if;
  update public.upload_links set uploads_used=uploads_used+files where id=link.id;
  insert into public.intake_reservations(link_id,file_count) values(link.id,files) returning id into target;
  return jsonb_build_object('reservation_id',target,'organization_id',link.organization_id,'supplier_id',link.supplier_id);
 end if;
 select * into reservation from public.intake_reservations where id=(payload->>'reservation_id')::uuid for update;
 if reservation.id is null or reservation.status<>'pending' then raise exception 'Submission is no longer pending'; end if;
 select * into link from public.upload_links where id=reservation.link_id for update;
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
revoke all on function public.relay_intake_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.relay_intake_api(text,jsonb) to service_role;
grant all on public.company_directory,public.workspace_settings,public.team_invitations,public.upload_links,public.intake_reservations,public.document_shares,public.workspace_events to service_role;

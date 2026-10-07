-- Relay: tenant-isolated buyer workspace. Supplier sharing/invitation claiming
-- must be added explicitly; this migration never publishes company records.
create schema if not exists relay_private;
revoke all on schema relay_private from public, anon;
grant usage on schema relay_private to authenticated;

create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 legal_name text not null check(length(trim(legal_name)) between 1 and 160),
 country_code text not null default '' check(country_code='' or country_code ~ '^[A-Z]{2}$'),
 registration_number text not null default '', website text not null default '',
 created_at timestamptz not null default now()
);
create index organizations_owner_idx on public.organizations(owner_id);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','member')),
 primary key(organization_id,user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name)<=100),
 created_at timestamptz not null default now()
);
create function relay_private.can_access_org(org uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.organizations o where o.id=org and
 (o.owner_id=(select auth.uid()) or exists(
 select 1 from public.organization_members m where m.organization_id=o.id
 and m.user_id=(select auth.uid()) and (not write_access or m.role in ('owner','admin')))))
$$;
revoke all on function relay_private.can_access_org(uuid,boolean) from public,anon;
grant execute on function relay_private.can_access_org(uuid,boolean) to authenticated;

create table public.suppliers (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 legal_name text not null check(length(trim(legal_name)) between 1 and 160),
 country text not null default '', country_code text not null default '', city text not null default '',
 category text not null default '', registration_number text not null default '', website text not null default '',
 contact_name text not null default '', contact_email text not null default '',
 verified_at timestamptz, updated_at timestamptz not null default now(), unique(organization_id,id)
);
create table public.supplier_relationships (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, created_at timestamptz not null default now(),
 unique(organization_id,supplier_id), unique(organization_id,id),
 foreign key(organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade
);
create index supplier_relationships_supplier_idx on public.supplier_relationships(supplier_id);
create table public.documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, name text not null check(length(name) between 1 and 255),
 kind text not null check(kind in ('certificate','declaration','company')),
 mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 storage_path text not null unique,
 uploaded_by uuid not null default auth.uid() references auth.users(id), uploaded_at timestamptz not null default now(),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','verified')),
 unique(organization_id,id), unique(organization_id,supplier_id,id),
 foreign key(organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade,
 check(split_part(storage_path,'/',1)=organization_id::text and split_part(storage_path,'/',2)=supplier_id::text and split_part(storage_path,'/',3)=id::text)
);
create index documents_supplier_idx on public.documents(supplier_id);
create index documents_uploaded_by_idx on public.documents(uploaded_by);
create table public.certificates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, document_id uuid not null,
 standard text not null, issuer text not null default '', valid_from date not null, valid_until date not null,
 check(valid_until>=valid_from), unique(organization_id,id),
 foreign key(organization_id,supplier_id,document_id) references public.documents(organization_id,supplier_id,id) on delete cascade
);
create index certificates_document_idx on public.certificates(document_id);
create index certificates_supplier_idx on public.certificates(supplier_id);
create index certificates_expiry_idx on public.certificates(organization_id,valid_until);
create table public.requirements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 relationship_id uuid not null, name text not null,
 kind text not null check(kind in ('document','company','product')),
 status text not null default 'missing' check(status in ('satisfied','missing')),
 document_id uuid, unique(organization_id,id), unique(organization_id,relationship_id,id),
 foreign key(organization_id,relationship_id) references public.supplier_relationships(organization_id,id) on delete cascade,
 foreign key(organization_id,document_id) references public.documents(organization_id,id)
);
create index requirements_relationship_idx on public.requirements(relationship_id);
create index requirements_document_idx on public.requirements(document_id);
create table public.data_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 relationship_id uuid not null, title text not null check(length(trim(title)) between 1 and 160),
 status text not null default 'open' check(status in ('open','received')),
 requested_at timestamptz not null default now(), due_at date not null,
 unique(organization_id,id), unique(organization_id,relationship_id,id),
 foreign key(organization_id,relationship_id) references public.supplier_relationships(organization_id,id) on delete cascade
);
create index data_requests_relationship_idx on public.data_requests(relationship_id);
create table public.request_requirements (
 organization_id uuid not null, relationship_id uuid not null, request_id uuid not null, requirement_id uuid not null,
 primary key(request_id,requirement_id),
 foreign key(organization_id,relationship_id,request_id) references public.data_requests(organization_id,relationship_id,id) on delete cascade,
 foreign key(organization_id,relationship_id,requirement_id) references public.requirements(organization_id,relationship_id,id) on delete cascade
);
create index request_requirements_requirement_idx on public.request_requirements(requirement_id);
create index request_requirements_org_idx on public.request_requirements(organization_id);
create table public.products (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, name text not null, reference text not null default '', material text not null default '',
 foreign key(organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade
);
create index products_supplier_idx on public.products(supplier_id);
create index products_org_idx on public.products(organization_id);
create table public.activities (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 supplier_id uuid not null, actor_id uuid not null default auth.uid() references auth.users(id),
 title text not null, description text not null default '', occurred_at timestamptz not null default now(),
 kind text not null check(kind in ('document','supplier','request')),
 foreign key(organization_id,supplier_id) references public.suppliers(organization_id,id) on delete cascade
);
create index activities_supplier_idx on public.activities(supplier_id);
create index activities_actor_idx on public.activities(actor_id);
create index activities_org_date_idx on public.activities(organization_id,occurred_at desc);
create table public.notification_reads (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 notification_id text not null, read_at timestamptz not null default now(), primary key(user_id,notification_id)
);

alter table public.organizations enable row level security;
create policy organizations_read on public.organizations for select to authenticated using(relay_private.can_access_org(id));
create policy organizations_create on public.organizations for insert to authenticated with check(owner_id=(select auth.uid()));
create policy organizations_edit on public.organizations for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
-- Column grants prevent changing ownership through an ordinary update.
grant select,insert on public.organizations to authenticated;
grant update(legal_name,country_code,registration_number,website) on public.organizations to authenticated;
alter table public.organization_members enable row level security;
create policy members_read on public.organization_members for select to authenticated using(relay_private.can_access_org(organization_id));
-- Membership administration is intentionally not exposed to ordinary clients.
grant select on public.organization_members to authenticated;
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_create on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select,insert,update on public.profiles to authenticated;

do $$ declare t text; begin
 foreach t in array array['suppliers','supplier_relationships','documents','certificates','requirements','data_requests','request_requirements','products'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(relay_private.can_access_org(organization_id))',t);
 execute format('create policy tenant_create on public.%I for insert to authenticated with check(relay_private.can_access_org(organization_id,true))',t);
 execute format('create policy tenant_edit on public.%I for update to authenticated using(relay_private.can_access_org(organization_id,true)) with check(relay_private.can_access_org(organization_id,true))',t);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 end loop;
end $$;
alter table public.activities enable row level security;
create policy activities_read on public.activities for select to authenticated using(relay_private.can_access_org(organization_id));
create policy activities_create on public.activities for insert to authenticated with check(relay_private.can_access_org(organization_id,true) and actor_id=(select auth.uid()));
grant select,insert on public.activities to authenticated;
alter table public.notification_reads enable row level security;
create policy reads_own on public.notification_reads for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.notification_reads to authenticated;
-- Remove default table privileges granted by Supabase. Explicit grants above remain.
revoke all on all tables in schema public from anon;
revoke delete on all tables in schema public from authenticated;
grant delete on public.notification_reads to authenticated;
-- The default authenticated grants include ALL on some Supabase projects.
revoke update on public.organizations from authenticated;
grant update(legal_name,country_code,registration_number,website) on public.organizations to authenticated;
revoke insert,update on public.organization_members from authenticated;
revoke update on public.activities from authenticated;

create function public.create_workspace(company_name text, full_name text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare org uuid; begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Idempotent per owner: retries cannot create duplicate workspaces.
 perform pg_advisory_xact_lock(hashtextextended((select auth.uid())::text,0));
 select id into org from public.organizations where owner_id=(select auth.uid()) order by created_at limit 1;
 if org is null then insert into public.organizations(owner_id,legal_name) values((select auth.uid()),trim(company_name)) returning id into org; end if;
 insert into public.profiles(id,full_name) values((select auth.uid()),left(trim(full_name),100)) on conflict(id) do update set full_name=excluded.full_name;
 return org;
end $$;
revoke all on function public.create_workspace(text,text) from public,anon;
grant execute on function public.create_workspace(text,text) to authenticated;

create view public.relationship_health with (security_invoker=true) as
select r.*,case when count(q.id)=0 then 0 else round(100.0*count(q.id) filter(where q.status='satisfied')/count(q.id))::integer end as completeness,
 count(q.id) filter(where q.status='missing')::integer as missing_requirements,
 case when exists(select 1 from public.certificates c where c.organization_id=r.organization_id and c.supplier_id=r.supplier_id and c.valid_until<=current_date+30) then 'attention'
 when count(q.id)=0 or count(q.id) filter(where q.status='missing')>0 then 'missing' else 'complete' end as status
from public.supplier_relationships r left join public.requirements q on q.organization_id=r.organization_id and q.relationship_id=r.id group by r.id;
grant select on public.relationship_health to authenticated;
revoke all on public.relationship_health from anon;

-- Only policies are changed in the Storage schema; file operations use the API.
create policy relay_files_read on storage.objects for select to authenticated using(bucket_id='relay-documents' and exists(select 1 from public.suppliers s where s.organization_id::text=split_part(name,'/',1) and s.id::text=split_part(name,'/',2)));
create policy relay_files_create on storage.objects for insert to authenticated with check(bucket_id='relay-documents' and exists(select 1 from public.suppliers s where s.organization_id::text=split_part(name,'/',1) and s.id::text=split_part(name,'/',2) and relay_private.can_access_org(s.organization_id,true)));
create policy relay_files_edit on storage.objects for update to authenticated using(bucket_id='relay-documents' and exists(select 1 from public.suppliers s where s.organization_id::text=split_part(name,'/',1) and s.id::text=split_part(name,'/',2) and relay_private.can_access_org(s.organization_id,true))) with check(bucket_id='relay-documents' and exists(select 1 from public.suppliers s where s.organization_id::text=split_part(name,'/',1) and s.id::text=split_part(name,'/',2) and relay_private.can_access_org(s.organization_id,true)));

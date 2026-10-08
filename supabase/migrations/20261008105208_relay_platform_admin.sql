-- Platform operators are independent from organization owners.
create table relay_private.platform_operators(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now());
create table relay_private.company_suspensions(organization_id uuid primary key references public.organizations(id),reason text not null,changed_by uuid not null references auth.users(id),changed_at timestamptz not null default now());
create table relay_private.platform_audit(id bigint generated always as identity primary key,actor_id uuid not null references auth.users(id),organization_id uuid references public.organizations(id),action text not null,reason text not null,created_at timestamptz not null default now());
alter table relay_private.platform_operators enable row level security;
alter table relay_private.company_suspensions enable row level security;
alter table relay_private.platform_audit enable row level security;
revoke all on relay_private.platform_operators,relay_private.company_suspensions,relay_private.platform_audit from public,anon,authenticated;
-- Bootstrap only the existing confirmed, explicitly authorized operator account.
insert into relay_private.platform_operators(user_id) select id from auth.users where lower(email)='admin@vovere-studios.com' and email_confirmed_at is not null;
create or replace function relay_private.can_access_org(org uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and not exists(select 1 from relay_private.company_suspensions where organization_id=org) and exists(
 select 1 from public.organizations o where o.id=org and (o.owner_id=(select auth.uid()) or exists(select 1 from public.organization_members m where m.organization_id=o.id and m.user_id=(select auth.uid()) and (not write_access or m.role in ('owner','admin')))))
$$;
drop policy if exists organizations_read on public.organizations;
-- Remove all organization SELECT/UPDATE policies, including previous owner shortcuts.
do $$declare p record;begin for p in select policyname from pg_policies where schemaname='public' and tablename='organizations' and cmd in ('SELECT','UPDATE') loop execute format('drop policy %I on public.organizations',p.policyname);end loop;end$$;
create policy organizations_read on public.organizations for select to authenticated using(relay_private.can_access_org(id));
create policy organizations_update on public.organizations for update to authenticated using(owner_id=(select auth.uid()) and relay_private.can_access_org(id,true)) with check(owner_id=(select auth.uid()) and relay_private.can_access_org(id,true));
create function public.relay_platform_admin(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare uid uuid:=auth.uid(); target uuid; term text:=left(coalesce(payload->>'query',''),100); pg integer:=greatest(0,least(coalesce((payload->>'page')::integer,0),100000)); reason text; result jsonb;
begin
 if uid is null or not exists(select 1 from relay_private.platform_operators where user_id=uid) then raise exception 'RELAY operator access required' using errcode='42501';end if;
 if action='companies' then
  select jsonb_build_object('total',(select count(*) from public.organizations where legal_name ilike '%'||term||'%'),
   'companies',coalesce((select jsonb_agg(to_jsonb(c)) from (select o.id,o.legal_name,o.country_code,o.created_at,u.email owner_email,s.reason suspension_reason,s.changed_at suspended_at,(select count(*) from public.organization_members where organization_id=o.id)+1 members from public.organizations o join auth.users u on u.id=o.owner_id left join relay_private.company_suspensions s on s.organization_id=o.id where o.legal_name ilike '%'||term||'%' order by o.created_at desc,o.id limit 50 offset pg*50) c),'[]'::jsonb),
   'audit',coalesce((select jsonb_agg(to_jsonb(a)) from (select a.id,a.organization_id,o.legal_name,a.action,a.reason,a.created_at from relay_private.platform_audit a left join public.organizations o on o.id=a.organization_id order by a.created_at desc,a.id desc limit 25) a),'[]'::jsonb)) into result;
  return result;
 elsif action in ('suspend','reactivate') then
  target:=(payload->>'organization_id')::uuid;reason:=trim(coalesce(payload->>'reason',''));
  if length(reason) not between 8 and 500 then raise exception 'Enter a reason between 8 and 500 characters';end if;
  if not exists(select 1 from public.organizations where id=target) then raise exception 'Company not found';end if;
  if exists(select 1 from public.organizations o join relay_private.platform_operators p on p.user_id=o.owner_id where o.id=target) then raise exception 'Operator workspaces cannot be suspended here';end if;
  if action='suspend' then
   insert into relay_private.company_suspensions(organization_id,reason,changed_by) values(target,reason,uid) on conflict(organization_id) do update set reason=excluded.reason,changed_by=uid,changed_at=now();
   update public.company_directory set listed=false where organization_id=target;
   update public.upload_links set revoked_at=now() where organization_id=target and revoked_at is null;
   update public.team_invitations set revoked_at=now() where organization_id=target and revoked_at is null and accepted_by is null;
  else delete from relay_private.company_suspensions where organization_id=target;end if;
  insert into relay_private.platform_audit(actor_id,organization_id,action,reason) values(uid,target,action,reason);
  return jsonb_build_object('saved',true);
 else raise exception 'Unknown operator action';end if;
end$$;
revoke all on function public.relay_platform_admin(text,jsonb) from public,anon;
grant execute on function public.relay_platform_admin(text,jsonb) to authenticated;
-- Intake links and invitations stop immediately while a company is suspended.
create function relay_private.guard_suspended_writes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from relay_private.company_suspensions where organization_id=case when tg_table_name='intake_reservations' then (select organization_id from public.upload_links where id=(to_jsonb(new)->>'link_id')::uuid) else (to_jsonb(new)->>'organization_id')::uuid end) then raise exception 'This company is suspended' using errcode='42501';end if;return new;
end$$;
revoke all on function relay_private.guard_suspended_writes() from public,anon,authenticated;
create trigger suspension_guard before insert or update on public.documents for each row execute function relay_private.guard_suspended_writes();
create trigger suspension_guard before insert or update on public.intake_reservations for each row execute function relay_private.guard_suspended_writes();

create trigger suspension_guard before insert or update on public.organization_members for each row execute function relay_private.guard_suspended_writes();

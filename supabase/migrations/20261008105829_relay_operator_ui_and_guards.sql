create or replace function public.relay_platform_admin(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare uid uuid:=auth.uid(); target uuid; term text:=left(coalesce(payload->>'query',''),100); pg integer:=greatest(0,least(coalesce((payload->>'page')::integer,0),100000)); reason text; result jsonb;
begin
 if uid is null or not exists(select 1 from relay_private.platform_operators where user_id=uid) then raise exception 'RELAY operator access required' using errcode='42501';end if;
 if action='companies' then
  select jsonb_build_object('total',(select count(*) from public.organizations where legal_name ilike '%'||term||'%'),
   'companies',coalesce((select jsonb_agg(to_jsonb(c)) from (select o.id,o.legal_name,o.country_code,o.created_at,exists(select 1 from relay_private.platform_operators where user_id=o.owner_id) operator_workspace,u.email owner_email,s.reason suspension_reason,s.changed_at suspended_at,(select count(*) from public.organization_members where organization_id=o.id)+1 members from public.organizations o join auth.users u on u.id=o.owner_id left join relay_private.company_suspensions s on s.organization_id=o.id where o.legal_name ilike '%'||term||'%' order by o.created_at desc,o.id limit 50 offset pg*50) c),'[]'::jsonb),
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

-- Narrow invoker wrappers expose only the authorized private implementations.
alter function public.relay_platform_admin(text,jsonb) set schema relay_private;
alter function public.relay_workspace_snapshot(jsonb) set schema relay_private;
create function public.relay_platform_admin(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select relay_private.relay_platform_admin(action,payload)$$;
create function public.relay_workspace_snapshot(payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select relay_private.relay_workspace_snapshot(payload)$$;
revoke all on function public.relay_platform_admin(text,jsonb),public.relay_workspace_snapshot(jsonb) from public,anon;
grant execute on function public.relay_platform_admin(text,jsonb),public.relay_workspace_snapshot(jsonb) to authenticated;

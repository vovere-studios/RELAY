-- Billing is company-scoped. No payment credentials or card data are stored here.
-- These tables are private; clients can read only an authorized, sanitized snapshot.
create table relay_private.billing_accounts (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 environment text not null check(environment in ('sandbox','production')),
 customer_id text check(customer_id ~ '^ctm_[a-z0-9]{26}$'),
 subscription_id text check(subscription_id ~ '^sub_[a-z0-9]{26}$'),
 plan text not null default 'free' check(plan in ('free','core','pro')),
 cycle text check(cycle in ('month','year')),
 status text not null default 'free' check(status in ('free','active','trialing','past_due','paused','canceled')),
 period_end timestamptz,
 cancel_at timestamptz,
 provider_updated_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(organization_id,environment),
 unique(environment,customer_id), unique(environment,subscription_id)
);
create table relay_private.billing_attempts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 environment text not null,
 actor_id uuid not null references auth.users(id),
 plan text not null check(plan in ('core','pro')),
 cycle text not null check(cycle in ('month','year')),
 billing_email text not null check(length(billing_email) between 3 and 254),
 terms_version text,
 business_confirmed_at timestamptz not null default now(),
 state text not null default 'creating' check(state in ('creating','ready','completed','uncertain','expired')),
 customer_id text check(customer_id ~ '^ctm_[a-z0-9]{26}$'),
 transaction_id text check(transaction_id ~ '^txn_[a-z0-9]{26}$'),
 created_at timestamptz not null default now(),
 foreign key(organization_id,environment) references relay_private.billing_accounts(organization_id,environment) on delete cascade,
 unique(environment,transaction_id)
);
create index billing_attempts_company_date on relay_private.billing_attempts(organization_id,environment,created_at desc);
create index billing_attempts_actor on relay_private.billing_attempts(actor_id);
create unique index billing_one_open_attempt on relay_private.billing_attempts(organization_id,environment) where state in ('creating','ready','uncertain');
create table relay_private.billing_events (
 event_id text not null check(event_id ~ '^evt_[a-z0-9]{26}$'),
 environment text not null check(environment in ('sandbox','production')),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 occurred_at timestamptz not null,
 processed_at timestamptz not null default now(),
 primary key(environment,event_id)
);
create index billing_events_company on relay_private.billing_events(organization_id);
alter table relay_private.billing_accounts enable row level security;
alter table relay_private.billing_attempts enable row level security;
alter table relay_private.billing_events enable row level security;
revoke all on relay_private.billing_accounts,relay_private.billing_attempts,relay_private.billing_events from public,anon,authenticated;

create function relay_private.billing_snapshot(org uuid,env text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare account relay_private.billing_accounts; usage jsonb; pending jsonb;
begin
 if auth.uid() is null or not relay_private.can_access_org(org) then raise exception 'Company access denied.' using errcode='42501'; end if;
 if env not in ('sandbox','production') then raise exception 'Invalid billing environment.'; end if;
 select * into account from relay_private.billing_accounts where organization_id=org and environment=env;
 select jsonb_build_object(
  'documents',(select count(*) from public.documents d where d.organization_id=org and not exists(select 1 from relay_private.document_trash t where t.document_id=d.id) and relay_private.supplier_active(org,d.supplier_id)),
  'storage_bytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,16}$' then (metadata->>'size')::bigint else 0 end),0) from storage.objects where bucket_id='relay-documents' and name like org::text||'/%'),
  'seats',(select count(distinct u) from (select owner_id u from public.organizations where id=org union select user_id from public.organization_members where organization_id=org) members),
  'suppliers',(select count(*) from relay_private.active_suppliers where organization_id=org)) into usage;
 select jsonb_build_object('state',state,'plan',plan,'cycle',cycle,'created_at',created_at) into pending from relay_private.billing_attempts where organization_id=org and environment=env and state in ('creating','ready','uncertain') order by created_at desc limit 1;
 return jsonb_build_object('plan',coalesce(account.plan,'free'),'cycle',account.cycle,'status',coalesce(account.status,'free'),'period_end',account.period_end,'cancel_at',account.cancel_at,'can_manage',relay_private.can_access_org(org,true),'usage',usage,'pending',pending,'quota_enforced',false);
end; $$;
create function public.relay_billing_snapshot(org uuid,env text default 'production') returns jsonb language sql security invoker set search_path='' as $$select relay_private.billing_snapshot(org,env)$$;
revoke all on function relay_private.billing_snapshot(uuid,text),public.relay_billing_snapshot(uuid,text) from public,anon;
grant execute on function relay_private.billing_snapshot(uuid,text),public.relay_billing_snapshot(uuid,text) to authenticated;

-- The server validates the access token with Auth. This function checks current database membership again.
create function relay_private.billing_service(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare org uuid; env text; actor uuid; acct relay_private.billing_accounts; attempt relay_private.billing_attempts; ev text; stamp timestamptz; subid text; cust text;
begin
 env:=payload->>'environment';
 if env is null or env not in ('sandbox','production') then raise exception 'Invalid billing environment.'; end if;
 if action='event_binding' then
  select * into acct from relay_private.billing_accounts where environment=env and customer_id=payload->>'customer_id';
  if not found then return jsonb_build_object('ignored',true); end if;
  if acct.subscription_id is not null and acct.subscription_id<>payload->>'subscription_id' and acct.status<>'canceled' then return jsonb_build_object('ignored',true); end if;
  select * into attempt from relay_private.billing_attempts where environment=env and organization_id=acct.organization_id and customer_id=acct.customer_id and id=(payload->>'attempt_id')::uuid and transaction_id is not null;
  if not found then raise exception 'Provider transaction has not been recorded.'; end if;
  return jsonb_build_object('transaction_id',attempt.transaction_id);
 end if;
 if action='apply' then
  ev:=payload->>'event_id'; cust:=payload->>'customer_id'; subid:=payload->>'subscription_id'; stamp:=(payload->>'provider_updated_at')::timestamptz;
  if ev is null or ev !~ '^evt_[a-z0-9]{26}$' or cust is null or cust !~ '^ctm_[a-z0-9]{26}$' or subid is null or subid !~ '^sub_[a-z0-9]{26}$' or stamp is null then raise exception 'Invalid provider event.'; end if;
  select * into acct from relay_private.billing_accounts where environment=env and customer_id=cust for update;
  if not found then return jsonb_build_object('ignored',true); end if;
  org:=acct.organization_id;
  if exists(select 1 from relay_private.billing_events where environment=env and event_id=ev) then return jsonb_build_object('duplicate',true); end if;
  if acct.subscription_id is distinct from subid then
   if acct.subscription_id is not null and acct.status<>'canceled' then raise exception 'Another subscription already exists.'; end if;
   select * into attempt from relay_private.billing_attempts where organization_id=org and environment=env and customer_id=cust and id=(payload->>'attempt_id')::uuid and transaction_id=(payload->>'transaction_id') and state in ('ready','uncertain','completed') for update;
   if not found then raise exception 'Provider transaction has not been bound to this company.'; end if;
   if attempt.plan is distinct from payload->>'plan' or attempt.cycle is distinct from payload->>'cycle' then raise exception 'Provider price does not match the company order.'; end if;
  end if;
  if coalesce(payload->>'plan','') not in ('core','pro') or coalesce(payload->>'cycle','') not in ('month','year') or coalesce(payload->>'status','') not in ('active','trialing','past_due','paused','canceled') then raise exception 'Invalid subscription.'; end if;
  insert into relay_private.billing_events(event_id,environment,organization_id,occurred_at) values(ev,env,org,(payload->>'occurred_at')::timestamptz);
  if acct.provider_updated_at is not null and stamp<=acct.provider_updated_at then return jsonb_build_object('stale',true); end if;
  update relay_private.billing_accounts set subscription_id=subid,plan=case when payload->>'status' in ('active','trialing','past_due') then payload->>'plan' else 'free' end,cycle=payload->>'cycle',status=payload->>'status',period_end=(payload->>'period_end')::timestamptz,cancel_at=(payload->>'cancel_at')::timestamptz,provider_updated_at=stamp,updated_at=now() where organization_id=org and environment=env;
  update relay_private.billing_attempts set state='completed' where organization_id=org and environment=env and transaction_id=(payload->>'transaction_id');
  return jsonb_build_object('applied',true);
 end if;
 org:=(payload->>'organization_id')::uuid; actor:=(payload->>'actor_id')::uuid;
 if action='resume' then
  select * into attempt from relay_private.billing_attempts where environment=env and transaction_id=payload->>'transaction_id' and state='ready';
  if not found then raise exception 'This checkout is unavailable.'; end if;
  org:=attempt.organization_id;
 end if;
 if actor is null or org is null or exists(select 1 from relay_private.company_suspensions where organization_id=org) or not exists(select 1 from public.organizations o where o.id=org and (o.owner_id=actor or exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=actor and m.role in ('owner','admin')))) then raise exception 'Only owners and administrators can manage company billing.' using errcode='42501'; end if;
 insert into relay_private.billing_accounts(organization_id,environment) values(org,env) on conflict do nothing;
 select * into acct from relay_private.billing_accounts where organization_id=org and environment=env for update;
 if action='resume' then return jsonb_build_object('organization_id',org); end if;
 if action='begin' then
  if payload->>'plan' is null or payload->>'plan' not in ('core','pro') or payload->>'cycle' is null or payload->>'cycle' not in ('month','year') then raise exception 'Invalid plan.'; end if;
  if acct.subscription_id is not null and acct.status<>'canceled' then raise exception 'Manage the existing company subscription instead of starting another one.'; end if;
  select * into attempt from relay_private.billing_attempts where organization_id=org and environment=env and state in ('creating','ready','uncertain') for update;
  if found then
   if attempt.actor_id<>actor or attempt.plan<>payload->>'plan' or attempt.cycle<>payload->>'cycle' then raise exception 'A company checkout is already pending. Finish it or ask an owner to review it.'; end if;
   return jsonb_build_object('id',attempt.id,'state',attempt.state,'customer_id',coalesce(attempt.customer_id,acct.customer_id),'transaction_id',attempt.transaction_id,'created',false);
  end if;
  if payload->>'billing_email' is null or length(payload->>'billing_email') not between 3 and 254 then raise exception 'Enter a billing email.'; end if;
  insert into relay_private.billing_attempts(organization_id,environment,actor_id,plan,cycle,billing_email,customer_id,terms_version) values(org,env,actor,payload->>'plan',payload->>'cycle',lower(payload->>'billing_email'),acct.customer_id,payload->>'terms_version') returning * into attempt;
  return jsonb_build_object('id',attempt.id,'state',attempt.state,'customer_id',attempt.customer_id,'created',true);
 elsif action in ('customer','transaction','uncertain') then
  select * into attempt from relay_private.billing_attempts where id=(payload->>'attempt_id')::uuid and organization_id=org and environment=env and actor_id=actor for update;
  if not found or attempt.state not in ('creating','uncertain') then raise exception 'Checkout attempt is unavailable.'; end if;
  if action='customer' then
   cust:=payload->>'customer_id';
   if cust is null or cust !~ '^ctm_[a-z0-9]{26}$' or (acct.customer_id is not null and acct.customer_id<>cust) then raise exception 'Invalid billing customer.'; end if;
   update relay_private.billing_accounts set customer_id=cust where organization_id=org and environment=env;
   update relay_private.billing_attempts set customer_id=cust where id=attempt.id;
  elsif action='transaction' then
   if payload->>'transaction_id' is null or payload->>'transaction_id' !~ '^txn_[a-z0-9]{26}$' or attempt.customer_id is null then raise exception 'Invalid company transaction.'; end if;
   update relay_private.billing_attempts set transaction_id=payload->>'transaction_id',state='ready' where id=attempt.id;
  else update relay_private.billing_attempts set state='uncertain' where id=attempt.id;
  end if;
  return jsonb_build_object('saved',true);
 elsif action='portal' then
  if acct.customer_id is null or acct.subscription_id is null then raise exception 'No company subscription is available.'; end if;
  return jsonb_build_object('customer_id',acct.customer_id,'subscription_id',acct.subscription_id);
 end if;
 raise exception 'Unknown billing action.';
end; $$;
create function public.relay_billing_service(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select relay_private.billing_service(action,payload)$$;
revoke all on function relay_private.billing_service(text,jsonb),public.relay_billing_service(text,jsonb) from public,anon,authenticated;
grant execute on function relay_private.billing_service(text,jsonb),public.relay_billing_service(text,jsonb) to service_role;

-- ANDRAI OS · OS-11 — Transactional audit-event outbox (NO external dispatch)
-- Branch feature/os-11; append-only, owner-only read, no PII/email addresses.
-- Each event is created inside the SAME transaction as the source audit record.
-- Dispatch is explicitly HELD, and no send workers, webhooks, Resend or agents are enabled.

create table public.os_event_outbox (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.os_organizations(id),
 audit_event_id bigint not null unique references public.os_audit_events(id),
 event_class text not null check (event_class in ('sales','operations','commerce','finance')),
 entity_type text not null check(entity_type in (
  'os_clients','os_opportunities','os_projects','os_tasks',
  'os_quotes','os_quote_snapshots','os_ledger'
 )),
 entity_id uuid not null,
 source_action text not null check(source_action in ('INSERT','UPDATE','DELETE')),
 occurred_at timestamptz not null,
 dispatch_state text not null default 'held' check(dispatch_state='held'),
 created_at timestamptz not null default now()
);
comment on table public.os_event_outbox is
 'OS11 sanitized transactional audit-event outbox. No external dispatch or recipient details.';

create index os11_event_org_time_idx
 on public.os_event_outbox(organization_id,occurred_at desc,id);
create index os11_event_org_category_idx
 on public.os_event_outbox(organization_id,event_class,occurred_at desc);

alter table public.os_event_outbox enable row level security;
revoke all on table public.os_event_outbox from public,anon,authenticated;
grant select on table public.os_event_outbox to authenticated;
create policy os11_event_owner_read on public.os_event_outbox
 for select to authenticated
 using(os_private.member_role(organization_id)='owner');

-- Immutable even if another grant is mistakenly added later.
create function os_private.os11_event_no_mutations()
returns trigger
language plpgsql security invoker set search_path=''
as $immut$
begin
 raise exception 'Event history is immutable'
   using errcode='42501';
end
$immut$;
revoke all on function os_private.os11_event_no_mutations()
 from public,anon,authenticated;
create trigger os11_event_immutable
 before update or delete on public.os_event_outbox
 for each row execute function os_private.os11_event_no_mutations();

-- Private DB-owned function bridges existing security-definer audit logging.
-- Only fields already in audit are copied; never copy row text, notes or emails.
create function os_private.os11_capture_audit()
returns trigger
language plpgsql
security definer
set search_path=''
as $capture$
declare
 v_class text;
begin
 v_class:=case
  when new.entity in ('os_clients','os_opportunities') then 'sales'
  when new.entity in ('os_projects','os_tasks') then 'operations'
  when new.entity in ('os_quotes','os_quote_snapshots') then 'commerce'
  when new.entity='os_ledger' then 'finance'
  else null
 end;
 if v_class is null then return new;end if;

 insert into public.os_event_outbox(
  organization_id,audit_event_id,event_class,entity_type,entity_id,
  source_action,occurred_at,dispatch_state
 ) values (
  new.organization_id,new.id,v_class,new.entity,new.entity_id,
  new.action,new.occurred_at,'held'
 ) on conflict(audit_event_id) do nothing;

 return new;
end
$capture$;
revoke all on function os_private.os11_capture_audit()
 from public,anon,authenticated;
create trigger os11_audit_outbox
 after insert on public.os_audit_events
 for each row execute function os_private.os11_capture_audit();

-- Explicit owner-only RLS-preserving read RPC. Client cannot choose a tenant.
create function public.os11_event_feed_v1(
 p_days integer default 30,
 p_limit integer default 50
)
returns table(
 event_id uuid,
 event_class text,
 entity_type text,
 source_action text,
 occurred_at timestamptz,
 dispatch_state text
)
language plpgsql stable security invoker set search_path=''
as $feed$
declare
 v_org uuid;
 v_today date:=(pg_catalog.now() at time zone 'America/Monterrey')::date;
 v_first date;
 v_begin timestamptz;
 v_end timestamptz;
begin
 if p_days is null or p_days not in (7,30,90)
   or p_limit is null or p_limit not between 1 and 100
 then raise exception 'Unsupported event feed window' using errcode='22023';end if;
 select s.organization_id into v_org from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
  and os_private.member_role(s.organization_id)='owner'
 limit 1;
 if v_org is null then
  raise exception 'Direction access required' using errcode='42501';end if;

 v_first:=v_today-(p_days-1);
 v_begin:=(v_first::timestamp at time zone 'America/Monterrey');
 v_end:=((v_today+1)::timestamp at time zone 'America/Monterrey');
 return query
 select e.id,e.event_class,e.entity_type,e.source_action,
  e.occurred_at,e.dispatch_state
 from public.os_event_outbox e
 where e.organization_id=v_org
  and e.occurred_at>=v_begin and e.occurred_at<v_end
 order by e.occurred_at desc,e.id desc
 limit p_limit;
end
$feed$;

create function public.os11_event_summary_v1(p_days integer default 30)
returns jsonb
language plpgsql stable security invoker set search_path=''
as $sum$
declare
 v_org uuid;
 v_today date:=(pg_catalog.now() at time zone 'America/Monterrey')::date;
 v_first date;
 v_begin timestamptz;
 v_end timestamptz;
 v_total bigint;
 v_categories jsonb;
 v_actions jsonb;
begin
 if p_days is null or p_days not in (7,30,90)
 then raise exception 'Unsupported event summary window' using errcode='22023';end if;
 select s.organization_id into v_org from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
   and os_private.member_role(s.organization_id)='owner'
 limit 1;
 if v_org is null then
  raise exception 'Direction access required' using errcode='42501';end if;
 v_first:=v_today-(p_days-1);
 v_begin:=(v_first::timestamp at time zone 'America/Monterrey');
 v_end:=((v_today+1)::timestamp at time zone 'America/Monterrey');

 select count(*)::bigint into v_total from public.os_event_outbox e
 where e.organization_id=v_org
   and e.occurred_at>=v_begin and e.occurred_at<v_end;

 select coalesce(jsonb_agg(jsonb_build_object(
  'key',categories.category,'count',coalesce(counts.n,0)
 ) order by categories.idx),'[]'::jsonb)
 into v_categories
 from (values (1,'sales'),(2,'operations'),(3,'commerce'),(4,'finance'))
   as categories(idx,category)
 left join (
  select e.event_class,count(*)::bigint n
  from public.os_event_outbox e where e.organization_id=v_org
   and e.occurred_at>=v_begin and e.occurred_at<v_end
  group by e.event_class
 ) counts on counts.event_class=categories.category;

 select coalesce(jsonb_agg(jsonb_build_object(
  'key',actions.action,'count',coalesce(counts.n,0)
 ) order by actions.idx),'[]'::jsonb)
 into v_actions
 from (values (1,'INSERT'),(2,'UPDATE'),(3,'DELETE'))
   as actions(idx,action)
 left join (
  select e.source_action,count(*)::bigint n
  from public.os_event_outbox e where e.organization_id=v_org
   and e.occurred_at>=v_begin and e.occurred_at<v_end
  group by e.source_action
 ) counts on counts.source_action=actions.action;

 return jsonb_build_object(
  'days',p_days,
  'role','owner',
  'as_of',v_today,
  'period_start',v_first,
  'period_end',v_today,
  'timezone','America/Monterrey',
  'total',v_total,
  'held',v_total,
  'external_dispatched',0,
  'categories',v_categories,
  'actions',v_actions
 );
end
$sum$;

revoke all on function public.os11_event_feed_v1(integer,integer)
 from public,anon,authenticated;
revoke all on function public.os11_event_summary_v1(integer)
 from public,anon,authenticated;
grant execute on function public.os11_event_feed_v1(integer,integer)
 to authenticated;
grant execute on function public.os11_event_summary_v1(integer)
 to authenticated;

notify pgrst,'reload schema';

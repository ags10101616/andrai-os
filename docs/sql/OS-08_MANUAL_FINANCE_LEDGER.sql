-- ANDRAI OS · OS-08 · Manual cash movement and quote reconciliation.
-- Every movement represents a MANUALLY REPORTED event, not provider-verified settlement.
-- Cashbook is neither CFDI invoicing nor an accounting general ledger.

alter table public.os_ledger
  add column quote_id uuid,
  add column entry_type text not null default 'receipt'
    check(entry_type in ('receipt','expense','refund')),
  add column method text not null default 'other'
    check(method in ('transfer','cash','card','other')),
  add column note text not null default ''
    check(char_length(note)<=1500),
  add column currency text not null default 'MXN'
    check(currency='MXN'),
  add constraint os08_type_kind_match check(
    (entry_type='receipt' and kind='income')
    or (entry_type in ('expense','refund') and kind='expense')
  ),
  add constraint os08_expense_unlinked check(
    (entry_type<>'expense' or quote_id is null)
    and (entry_type<>'refund' or quote_id is not null)
  ),
  add constraint os08_quote_tenant_fk
    foreign key(organization_id,quote_id)
    references public.os_quotes(organization_id,id);

create index os08_ledger_quote_history
  on public.os_ledger(organization_id,quote_id,happened_on desc)
  where quote_id is not null;

-- An append-only record cannot be rewritten to hide or "correct" a payment.
-- Corrections are new compensating entries, with their own audit trail.
create function os_private.os08_ledger_immutable()
returns trigger language plpgsql security invoker set search_path=''
as $body$
begin
 raise exception 'Financial entries are immutable; record a separate correction'
  using errcode='42501';
end $body$;
revoke all on function os_private.os08_ledger_immutable()
 from public,anon,authenticated;
create trigger os08_no_mutations
  before update or delete on public.os_ledger
  for each row execute function os_private.os08_ledger_immutable();

create function os_private.os08_validate_manual_entry()
returns trigger language plpgsql security invoker set search_path=''
as $body$
declare
  quote_record public.os_quotes%rowtype;
  net_paid numeric:=0;
begin
 if os_private.member_role(new.organization_id)<>'owner'
   or new.entered_by is distinct from (select auth.uid())
 then raise exception 'Direction membership required' using errcode='42501';end if;
 if new.amount_minor is null or new.amount_minor not between 1 and 999999999999
   or new.reference is null or length(btrim(new.reference)) not between 2 and 200
   or new.happened_on is null or new.happened_on>current_date
   or new.happened_on<date '2020-01-01'
   or new.currency<>'MXN' or length(new.note)>1500
   or new.method not in ('transfer','cash','card','other')
 then raise exception 'Invalid financial event' using errcode='22023';end if;
 if (new.entry_type='receipt' and new.kind<>'income')
   or (new.entry_type in ('expense','refund') and new.kind<>'expense')
   or (new.entry_type='refund' and new.quote_id is null)
   or (new.entry_type='expense' and new.quote_id is not null)
 then raise exception 'Invalid entry classification' using errcode='22023';end if;

 if new.quote_id is not null then
  -- Lock this quote's payment stream across concurrent requests, even if
  -- a caller attempts to bypass the RPC and insert via PostgREST directly.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.organization_id::text||':'||new.quote_id::text,0)
  );
  select q.* into quote_record from public.os_quotes q
    where q.id=new.quote_id and q.organization_id=new.organization_id;
  if not found then raise exception 'Quote not available in this organization'
    using errcode='42501';end if;
  if new.entry_type='receipt' and quote_record.status not in ('sent','accepted') then
   raise exception 'Only sent/accepted quotes can receive manual payments'
      using errcode='42501';end if;
  if new.entry_type='refund' and quote_record.status not in ('sent','accepted','rejected') then
   raise exception 'This quote cannot be refunded' using errcode='42501';end if;
  if new.project_id is distinct from quote_record.project_id then
   raise exception 'Quote and project link mismatch' using errcode='42501';end if;

  select coalesce(sum(case
     when l.entry_type='receipt' then l.amount_minor
     when l.entry_type='refund' then -l.amount_minor
     else 0
   end),0)::numeric
   into net_paid from public.os_ledger l
   where l.organization_id=new.organization_id and l.quote_id=new.quote_id;

  if new.entry_type='receipt' and
     net_paid+new.amount_minor>quote_record.total_minor then
   raise exception 'Payment exceeds remaining quote balance' using errcode='22023';
  end if;
  if new.entry_type='refund' and
     net_paid-new.amount_minor<0 then
   raise exception 'Refund exceeds recorded net receipts' using errcode='22023';
  end if;
 elsif new.project_id is not null then
  if not exists(
   select 1 from public.os_projects p
   where p.id=new.project_id and p.organization_id=new.organization_id
  ) then raise exception 'Project not available' using errcode='42501';end if;
 end if;
 new.reference:=btrim(new.reference);
 new.note:=btrim(new.note);
 return new;
end $body$;
revoke all on function os_private.os08_validate_manual_entry()
 from public,anon,authenticated;
create trigger os08_validate_entry before insert on public.os_ledger
  for each row execute function os_private.os08_validate_manual_entry();

-- Existing INSERT grant is retained, since this is SECURITY INVOKER.
-- Its trigger enforces exactly the same limits for all callers (RPC or REST).
-- No UPDATE/DELETE access is granted to the authenticated role.
revoke update,delete on public.os_ledger from authenticated;

create function public.os08_record_manual_entry_v1(
 p_id uuid,p_type text,p_amount_minor bigint,p_reference text,
 p_method text,p_happened_on date,p_note text,
 p_quote_id uuid,p_project_id uuid
)
returns table(entry_id uuid,created boolean)
language plpgsql volatile security invoker set search_path=''
as $body$
declare
  org uuid;
  actor uuid:=(select auth.uid());
  resolved_project uuid;
  linked public.os_quotes%rowtype;
  existing public.os_ledger%rowtype;
  inserted int;
  kind_value text;
  norm_reference text:=btrim(p_reference);
  norm_note text:=btrim(coalesce(p_note,''));
begin
 if actor is null then raise exception 'Login required' using errcode='42501';end if;
 select s.organization_id into org from public.os_staff s
 where s.active and s.bound_user_id=actor
 and os_private.member_role(s.organization_id)='owner' limit 1;
 if org is null then raise exception 'Direction access required' using errcode='42501';end if;
 if p_id is null or p_type not in ('receipt','expense','refund')
   or p_method not in ('transfer','cash','card','other')
   or p_amount_minor is null or p_amount_minor not between 1 and 999999999999
   or p_happened_on is null or p_happened_on>current_date
   or p_happened_on<date '2020-01-01'
   or norm_reference is null or char_length(norm_reference) not between 2 and 200
   or char_length(norm_note)>1500
   or (p_type='refund' and p_quote_id is null)
   or (p_type='expense' and p_quote_id is not null)
 then raise exception 'Invalid financial input' using errcode='22023';end if;
 if p_quote_id is not null then
  perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(org::text||':'||p_quote_id::text,0)
  );
  select q.* into linked from public.os_quotes q
    where q.id=p_quote_id and q.organization_id=org;
  if not found then raise exception 'Quote not available' using errcode='42501';end if;
  if p_project_id is not null and p_project_id is distinct from linked.project_id then
   raise exception 'Project link inconsistent with quote' using errcode='42501';end if;
  resolved_project:=linked.project_id;
 else
  resolved_project:=p_project_id;
  if resolved_project is not null and not exists(
   select 1 from public.os_projects p
   where p.id=resolved_project and p.organization_id=org
  ) then raise exception 'Project not available' using errcode='42501';end if;
 end if;
 kind_value:=case when p_type='receipt' then 'income' else 'expense' end;

 -- A retry must reuse the same UUID and the same normalized payload.
 -- Compare against the stored record BEFORE attempting a new INSERT.
 select l.* into existing from public.os_ledger l
 where l.id=p_id and l.organization_id=org;
 if found then
  if existing.quote_id is distinct from p_quote_id
    or existing.project_id is distinct from resolved_project
    or existing.kind is distinct from kind_value
    or existing.entry_type is distinct from p_type
    or existing.amount_minor is distinct from p_amount_minor
    or existing.reference is distinct from norm_reference
    or existing.method is distinct from p_method
    or existing.note is distinct from norm_note
    or existing.happened_on is distinct from p_happened_on
    or existing.entered_by is distinct from actor
   then raise exception 'Manual entry idempotency conflict' using errcode='23505';end if;
  return query select existing.id,false;
  return;
 end if;

 insert into public.os_ledger(
  id,organization_id,project_id,quote_id,kind,entry_type,amount_minor,
  reference,happened_on,entered_by,method,note,currency
 ) values (
  p_id,org,resolved_project,p_quote_id,kind_value,p_type,p_amount_minor,
  norm_reference,p_happened_on,actor,p_method,norm_note,'MXN'
 ) on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 select l.* into existing from public.os_ledger l
 where l.id=p_id and l.organization_id=org;
 if not found or existing.entry_type is distinct from p_type
  or existing.amount_minor is distinct from p_amount_minor
  or existing.reference is distinct from norm_reference
  or existing.quote_id is distinct from p_quote_id
  or existing.project_id is distinct from resolved_project
  or existing.happened_on is distinct from p_happened_on
  or existing.method is distinct from p_method
  or existing.note is distinct from norm_note
  or existing.entered_by is distinct from actor
 then raise exception 'Financial request ID is already in use'
  using errcode='23505';end if;
 return query select existing.id,inserted=1;
end $body$;

-- All summary figures are derived from every authorized database record,
-- not from a truncated list or from the client browser.
create function public.os08_finance_summary_v1()
returns table(
 receipts_minor bigint,
 expenses_minor bigint,
 refunds_minor bigint,
 net_movement_minor bigint,
 accepted_quote_total_minor bigint,
 accepted_quote_open_minor bigint
)
language plpgsql stable security invoker set search_path=''
as $body$
declare org uuid;
begin
 select s.organization_id into org from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
  and os_private.member_role(s.organization_id)='owner' limit 1;
 if org is null then raise exception 'Direction access required' using errcode='42501';end if;
 return query
 with cash as (
   select
     coalesce(sum(l.amount_minor) filter(where l.entry_type='receipt'),0)::bigint r,
     coalesce(sum(l.amount_minor) filter(where l.entry_type='expense'),0)::bigint e,
     coalesce(sum(l.amount_minor) filter(where l.entry_type='refund'),0)::bigint f
   from public.os_ledger l where l.organization_id=org
 ),
 accepted as (
   select q.id,q.total_minor::numeric total,
    coalesce(sum(case
     when l.entry_type='receipt' then l.amount_minor
     when l.entry_type='refund' then -l.amount_minor
     else 0 end),0)::numeric net_paid
   from public.os_quotes q
    left join public.os_ledger l
      on l.quote_id=q.id and l.organization_id=q.organization_id
   where q.organization_id=org and q.status='accepted'
   group by q.id
 ),
 accepted_sum as (
  select coalesce(sum(total),0)::bigint accepted_total,
    coalesce(sum(greatest(total-net_paid,0)),0)::bigint accepted_open
  from accepted
 )
 select cash.r,cash.e,cash.f,(cash.r-cash.e-cash.f),
  accepted_sum.accepted_total,accepted_sum.accepted_open
 from cash cross join accepted_sum;
end $body$;

create function public.os08_quote_balances_v1()
returns table(
 quote_id uuid,quote_total_minor bigint,
 received_minor bigint,refunded_minor bigint,
 remaining_minor bigint
)
language plpgsql stable security invoker set search_path=''
as $body$
declare org uuid;
begin
 select s.organization_id into org from public.os_staff s
 where s.active and s.bound_user_id=(select auth.uid())
   and os_private.member_role(s.organization_id)='owner' limit 1;
 if org is null then raise exception 'Direction access required' using errcode='42501';end if;
 return query
 select q.id,q.total_minor,
  coalesce(sum(l.amount_minor) filter(where l.entry_type='receipt'),0)::bigint,
  coalesce(sum(l.amount_minor) filter(where l.entry_type='refund'),0)::bigint,
  greatest(q.total_minor::numeric -
     coalesce(sum(case when l.entry_type='receipt' then l.amount_minor
       when l.entry_type='refund' then -l.amount_minor else 0 end),0),
    0)::bigint
 from public.os_quotes q
 left join public.os_ledger l on l.organization_id=q.organization_id
   and l.quote_id=q.id
 where q.organization_id=org and q.status='accepted'
 group by q.id,q.total_minor
 order by q.id;
end $body$;

revoke all on function public.os08_record_manual_entry_v1(
 uuid,text,bigint,text,text,date,text,uuid,uuid
) from public,anon,authenticated;
revoke all on function public.os08_finance_summary_v1()
 from public,anon,authenticated;
revoke all on function public.os08_quote_balances_v1()
 from public,anon,authenticated;
grant execute on function public.os08_record_manual_entry_v1(
 uuid,text,bigint,text,text,date,text,uuid,uuid
) to authenticated;
grant execute on function public.os08_finance_summary_v1() to authenticated;
grant execute on function public.os08_quote_balances_v1() to authenticated;

notify pgrst,'reload schema';
